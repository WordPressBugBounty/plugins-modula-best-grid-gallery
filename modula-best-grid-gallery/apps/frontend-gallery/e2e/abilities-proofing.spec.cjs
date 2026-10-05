const { test, expect } = require('./evidence.cjs');
const fs = require('node:fs');
const path = require('node:path');
const fixture = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'abilities-proofing-http.json'
		)
	)
);
test.skip(
	!fixture.available,
	'Lite gate is verified through native and HTTP MCP calls.'
);
test('Proofing administration persists and invitation controls visitor access', async ({
	page,
	evidence,
}) => {
	expect(fixture.passed && fixture.http_passed).toBe(true);
	await page.goto(fixture.gallery.editor_url);
	await expect(
		page.getByText('Proofing mode', { exact: true })
	).toBeVisible();
	const config = () =>
		page.evaluate(
			(id) =>
				window.wp.apiFetch({
					path: `/modula-image-proofing/v1/config/${id}`,
				}),
			fixture.gallery.id
		);
	expect((await config()).locked).toBe(true);
	expect(Number((await config()).max_selection)).toBe(3);
	const invites = await page.evaluate(
		(id) =>
			window.wp.apiFetch({
				path: `/modula-image-proofing/v1/invitations/${id}`,
			}),
		fixture.gallery.id
	);
	expect(
		invites.some((row) => Number(row.user_id) === fixture.client_id)
	).toBe(true);
	await page.evaluate(
		(id) =>
			window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/settings`,
				method: 'PATCH',
				data: { layout: { gutter: 19 } },
			}),
		fixture.gallery.id
	);
	await page.reload();
	await expect(
		page.getByText('Proofing mode', { exact: true })
	).toBeVisible();
	expect(Number((await config()).max_selection)).toBe(3);
	const selections = await page.evaluate(
		(id) =>
			window.wp.apiFetch({
				path: `/modula-image-proofing/v1/gallery-selections/${id}`,
			}),
		fixture.gallery.id
	);
	expect(selections).toHaveLength(1);
	expect(Number(selections[0].id)).toBe(fixture.moderation.selection_id);
	expect(Boolean(Number(selections[0].submitted))).toBe(false);
	expect(selections[0].notes).toBe(fixture.moderation.notes);
	await evidence.capture(page, 'proofing-admin-reopened');
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(fixture.page);
		await expect(
			publicPage
				.getByText('Owned proofing login required', { exact: false })
				.first()
		).toBeVisible();
		await expect(
			publicPage.locator(`#modula-${fixture.gallery.id}`)
		).toHaveCount(0);
		await publicPage.goto(fixture.guest_url);
		const root = publicPage.locator(`#modula-${fixture.gallery.id}`);
		await expect(root).toBeVisible();
		await evidence.capture(publicPage, 'proofing-invited-visitor');
	} finally {
		await visitor.close();
	}
});
