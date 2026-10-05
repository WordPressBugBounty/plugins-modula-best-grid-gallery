const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const operations = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'gallery-business-operations.json'
		)
	)
);

test('gallery operations preserve stored data during an explicit no-repair read', async ({
	page,
}, testInfo) => {
	await page.goto(catalog.pages.visible);
	await expect(
		page.locator(
			`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
		)
	).toBeVisible();
	expect(operations.read_without_repair).toBe(true);
	expect(operations.composition_preserves_attachment_text).toBe(true);
	expect(operations.settings_patch_preserves_unrequested_fields).toBe(true);
	expect(operations.filter_dismiss_strips_image_tags).toBe(true);
	await testInfo.attach('gallery-business-operations', {
		body: JSON.stringify(operations, null, 2),
		contentType: 'application/json',
	});
});

test('composition reopens mixed items and leaves a shared gallery’s attachment text intact', async ({
	page,
	evidence,
}) => {
	await page.goto(operations.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const rows = await page.evaluate(
		async (id) =>
			window.wp.apiFetch({ path: `/modula/v2/gallery/${id}/images` }),
		operations.composition_id
	);
	expect(rows).toHaveLength(3);
	expect(rows.map((row) => row.itemKind || 'image')).toEqual([
		'content_block',
		'image',
		'shortcode',
	]);
	expect(rows[1]).toMatchObject({
		id: operations.attachment_id,
		gridX: 2,
		gridY: 4,
		width: 3,
		height: 2,
	});
	await page.reload();
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(operations.reference_page);
		await expect(publicPage.locator('body')).not.toHaveClass(/logged-in/);
		await expect(
			publicPage
				.locator(`#modula-${operations.reference_id}`)
				.getByRole('img', { name: 'Shared operation alt', exact: true })
		).toBeVisible();
		await evidence.capture(publicPage, 'shared-attachment-text-preserved');
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('editor composition saves still update shared attachment text explicitly', async ({
	page,
	evidence,
}) => {
	await page.goto(operations.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const title = `Editor shared title ${process.env.MODULA_E2E_MODE}`;
	const alt = `Editor shared alt ${process.env.MODULA_E2E_MODE}`;
	const description = `Editor shared description ${process.env.MODULA_E2E_MODE}`;
	const saved = await page.evaluate(
		async ({ id, title, alt, description }) => {
			const items = await window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/images`,
			});
			items[1] = { ...items[1], title, alt, description };
			return window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/upload/save-merged-items`,
				method: 'POST',
				data: { items },
			});
		},
		{ id: operations.composition_id, title, alt, description }
	);
	expect(saved.ok).toBe(true);
	const media = await page.evaluate(
		async (id) =>
			window.wp.apiFetch({ path: `/wp/v2/media/${id}?context=edit` }),
		operations.attachment_id
	);
	expect(media.title.raw).toBe(title);
	expect(media.alt_text).toBe(alt);
	expect(media.description.raw).toBe(description);
	await page.reload();
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(operations.reference_page);
		await expect(
			publicPage
				.locator(`#modula-${operations.reference_id}`)
				.getByRole('img', { name: alt, exact: true })
		).toBeVisible();
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('settings PATCH preserves omitted fields, access rules and Pro password synchronization', async ({
	page,
	evidence,
}) => {
	await page.goto(operations.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const isPro = process.env.MODULA_E2E_MODE === 'pro';
	const patch = (data) =>
		page.evaluate(
			async ({ id, data }) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/settings`,
					method: 'PATCH',
					data,
				}),
			{ id: operations.composition_id, data }
		);
	const first = await patch({
		general: { randomFactor: 73 },
		filters: { filters: ['Keep me'] },
		...(isPro
			? {
					passwordProtect: {
						enablePassword: true,
						password: 'operations-test-gate',
					},
				}
			: {}),
	});
	expect(first.general.randomFactor).toBe(73);
	const changed = await patch({ layout: { gutter: '24' } });
	expect(changed.layout.gutter).toBe(24);
	expect(changed.general.randomFactor).toBe(73);
	expect(changed.filters.filters).toEqual(['Keep me']);
	if (isPro) {
		expect(changed.passwordProtect.password).toBe('operations-test-gate');
		const post = await page.evaluate(
			async (id) =>
				window.wp.apiFetch({
					path: `/wp/v2/modula-gallery/${id}?context=edit`,
				}),
			operations.composition_id
		);
		expect(post.password).toBe('operations-test-gate');
	}
	await page.reload();
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const reopened = await page.evaluate(
		async (id) =>
			window.wp.apiFetch({ path: `/modula/v2/gallery/${id}/settings` }),
		operations.composition_id
	);
	expect(reopened.layout.gutter).toBe(24);
	expect(reopened.general.randomFactor).toBe(73);
	expect(reopened.filters.filters).toEqual(['Keep me']);
	const cleared = await patch({ filters: { filters: [] } });
	expect(cleared.filters.filters).toEqual([]);
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(operations.reference_page);
		await expect(
			publicPage.locator(
				`#modula-${operations.reference_id} .modula-item`
			)
		).toBeVisible();
		const denied = await visitor.request.patch(
			`/wp-json/modula/v2/gallery/${operations.composition_id}/settings`,
			{ data: { layout: { gutter: 33 } } }
		);
		expect([401, 403]).toContain(denied.status());
		const classicDenied = await page.evaluate(async (id) => {
			try {
				await window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/settings`,
					method: 'PATCH',
					data: { layout: { gutter: 33 } },
				});
				return null;
			} catch (error) {
				return error.code;
			}
		}, catalog.galleries.classic.id);
		expect(classicDenied).toBe('rest_forbidden');
	} finally {
		await evidence.closeVisitor(visitor);
		if (isPro) await patch({ passwordProtect: { enablePassword: false } });
	}
});
