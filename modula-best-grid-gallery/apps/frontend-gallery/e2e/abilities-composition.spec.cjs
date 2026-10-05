const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const mode = process.env.MODULA_E2E_MODE;
const runDir = process.env.MODULA_E2E_RUN_DIR;
const result = JSON.parse(
	fs.readFileSync(path.join(runDir, mode, 'abilities-composition.json'))
);
const catalog = JSON.parse(fs.readFileSync(path.join(runDir, 'catalog.json')));
const id = result.input.id;
async function open(page) {
	await page.goto(result.outcome.gallery.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}
test('native image add survives editor reopen and is visible anonymously', async ({
	page,
	evidence,
}) => {
	expect(
		JSON.parse(
			fs.readFileSync(
				path.join(
					runDir,
					mode,
					'abilities-composition-native-only.json'
				)
			)
		).adapter_loaded
	).toBe(false);
	await open(page);
	const read = await native(page, 'modula/read-gallery', { id });
	expect(read.items.map((row) => row.id)).toContain(
		result.input.changes[0].id
	);
	await page.reload();
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const editorTiles = page.locator(
		'.modula-custom-grid__rgl .react-grid-item'
	);
	await expect(editorTiles).toHaveCount(5);
	const editorBoxes = await editorTiles.evaluateAll((rows) =>
		rows.map((row) => {
			const b = row.getBoundingClientRect();
			return { x: b.x, y: b.y, width: b.width, height: b.height };
		})
	);
	expect(editorBoxes[2].width).toBeGreaterThan(editorBoxes[1].width * 1.8);
	expect(editorBoxes[2].x).toBeGreaterThan(editorBoxes[1].x);
	expect(Math.abs(editorBoxes[2].y - editorBoxes[1].y)).toBeLessThan(2);
	await expect(page.locator('.modula-item--grid-locked')).toHaveCount(1);
	await expect(
		page.getByText('Unchanged body', { exact: true })
	).toBeVisible();
	await expect(
		page.getByText('Retained shortcode', { exact: true })
	).toBeVisible();
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const saveResponse = page.waitForResponse(
		(response) =>
			response.url().includes(`/modula/v2/gallery/${id}/settings`) &&
			response.request().method() !== 'GET' &&
			response.status() === 200
	);
	const gutter = page.getByRole('spinbutton', { name: 'Value', exact: true });
	await gutter.fill('12');
	await gutter.press('Tab');
	await saveResponse;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
	await open(page);
	await expect(editorTiles).toHaveCount(5);
	const editorRows = await page.evaluate(
		async (id) =>
			window.wp.apiFetch({ path: `/modula/v2/gallery/${id}/images` }),
		id
	);
	expect(editorRows.map((row) => row.id)).toEqual(
		result.final.items.map((row) => row.id)
	);
	expect(editorRows[2]).toMatchObject({
		gridX: 4,
		gridY: 0,
		width: 4,
		height: 2,
		gridLocked: 1,
	});
	await evidence.capture(page, 'composition-editor-reopened');
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(result.page);
		const tiles = publicPage.locator(`#modula-${id} .modula-item-tiled`);
		await expect(tiles).toHaveCount(5);
		const boxes = await tiles.evaluateAll((rows) =>
			rows.map((row) => {
				const b = row.getBoundingClientRect();
				return { x: b.x, y: b.y, width: b.width, height: b.height };
			})
		);
		expect(boxes[2].width).toBeGreaterThan(boxes[1].width * 1.8);
		expect(Math.abs(boxes[2].height - boxes[1].height)).toBeLessThan(2);
		expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
		expect(Math.abs(boxes[2].y - boxes[1].y)).toBeLessThan(2);
		await expect(
			publicPage.locator(
				`#modula-${id} a[href="https://example.invalid/composition"]`
			)
		).toHaveAttribute('target', '_blank');
		for (const href of result.fallback_links) {
			await expect(
				publicPage.locator(`#modula-${id} a[href="${href}"]`)
			).toHaveCount(1);
		}
		await evidence.capture(publicPage, 'composition-custom-grid');
		await publicPage.goto(result.reference_page);
		await expect(
			publicPage.locator(`#modula-${result.reference_id} img`)
		).toHaveCount(2);
		for (const [mediaId, expected] of Object.entries(result.shared)) {
			const media = await page.evaluate(
				async (id) =>
					window.wp.apiFetch({
						path: `/wp/v2/media/${id}?context=edit`,
					}),
				mediaId
			);
			expect(media.title.raw).toBe(expected[0].post_title);
			expect(media.caption.raw).toBe(expected[0].post_excerpt);
			expect(media.description.raw).toBe(expected[0].post_content);
			expect(media.alt_text).toBe(expected[1]);
		}
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
const operation = 'modula/update-gallery-images';
const prefix = `${catalog.run}-${mode}-composition-`;
async function patch(page, suffix, changes, revision) {
	const read = revision
		? null
		: await native(page, 'modula/read-gallery', { id, per_page: 1 });
	return native(
		page,
		operation,
		{
			request_id: prefix + suffix,
			id,
			revision: revision || read.gallery.revision,
			changes,
		},
		'POST'
	);
}
async function call(page, name, input, session) {
	return toolData(
		await mcp(
			page,
			'tools/call',
			{
				name: 'mcp-adapter-execute-ability',
				arguments: { ability_name: name, parameters: input },
			},
			session
		)
	).data;
}
test('MCP composes from a partial read, validates atomically and recovers original or uncertain outcomes', async ({
	page,
}, testInfo) => {
	await open(page);
	const initialized = await mcp(page, 'initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'Modula composition E2E', version: '1' },
	});
	const session = initialized.session;
	expect(session).toBeTruthy();
	try {
		const before = await call(
			page,
			'modula/read-gallery',
			{ id, per_page: 1 },
			session
		);
		expect(before.items).toHaveLength(1);
		const media = catalog.attachments[7].id;
		const anchor = catalog.attachments[0].id;
		const input = {
			request_id: prefix + 'mcp',
			id,
			revision: before.gallery.revision,
			changes: [
				{ action: 'add', id: media, fields: { width: 2, height: 2 } },
				{
					action: 'update',
					id: media,
					fields: { halign: 'left', valign: 'bottom' },
				},
				{ action: 'move', id: media, before_id: anchor },
			],
		};
		const out = await call(page, operation, input, session);
		expect(out.status).toBe('succeeded');
		const saved = await call(
			page,
			'modula/read-gallery',
			{ id, per_page: 100 },
			session
		);
		expect(saved.items).toHaveLength(6);
		expect(saved.items.find((row) => row.id === media)).toMatchObject({
			halign: 'left',
			valign: 'bottom',
		});
		expect(saved.items.map((row) => row.id)).toEqual([
			result.final.items[0].id,
			result.input.changes[0].id,
			media,
			anchor,
			result.final.items[3].id,
			catalog.attachments[2].id,
		]);
		const invalid = await call(
			page,
			operation,
			{
				...input,
				request_id: prefix + 'mcp-invalid',
				revision: saved.gallery.revision,
				changes: [
					{ action: 'remove', id: media },
					{ action: 'update', id: anchor, fields: { width: 1 } },
				],
			},
			session
		);
		expect(invalid.status).toBe('rejected');
		expect(
			(
				await call(
					page,
					'modula/read-gallery',
					{ id, per_page: 100 },
					session
				)
			).items
		).toEqual(saved.items);
		const removed = await call(
			page,
			operation,
			{
				...input,
				request_id: prefix + 'mcp-remove',
				revision: saved.gallery.revision,
				changes: [{ action: 'remove', id: media }],
			},
			session
		);
		expect(removed.status).toBe('succeeded');
		expect(await call(page, operation, input, session)).toEqual(out);
		expect(
			await call(
				page,
				'modula/recover-request',
				{ request_id: input.request_id },
				session
			)
		).toEqual(out);
		expect(
			(
				await call(
					page,
					'modula/read-gallery',
					{ id, per_page: 100 },
					session
				)
			).items
		).toEqual(result.final.items);
		const fresh = await call(page, 'modula/read-gallery', { id }, session);
		const faultyInput = {
			...input,
			request_id: prefix + 'http-output',
			revision: fresh.gallery.revision,
			changes: [
				{ action: 'update', id: anchor, fields: { halign: 'right' } },
			],
		};
		const faulty = await call(page, operation, faultyInput, session);
		expect(faulty).toMatchObject({
			status: 'uncertain',
			code: 'output_validation_failed',
			operation,
		});
		expect(
			await call(
				page,
				'modula/recover-request',
				{ request_id: faultyInput.request_id },
				session
			)
		).toEqual(faulty);
		expect(await call(page, operation, faultyInput, session)).toEqual(
			faulty
		);
		expect(
			(
				await call(page, 'modula/read-gallery', { id }, session)
			).items.find((row) => row.id === anchor).halign
		).toBe('right');
		await testInfo.attach('official-mcp-composition', {
			body: JSON.stringify({ out, invalid, removed, faulty }, null, 2),
			contentType: 'application/json',
		});
	} finally {
		const nonce = await page.evaluate(() => window.wpApiSettings.nonce);
		const response = await page.request.delete(
			'/wp-json/mcp/mcp-adapter-default-server',
			{
				headers: { 'X-WP-Nonce': nonce, 'Mcp-Session-Id': session },
				timeout: 15000,
			}
		);
		expect(response.ok()).toBe(true);
	}
});
test('concurrent composition and editor saves reject stale requests without replaying later changes', async ({
	page,
	evidence,
}, testInfo) => {
	await open(page);
	const media = catalog.attachments[0].id;
	const before = await native(page, 'modula/read-gallery', { id });
	const outcomes = await Promise.all([
		patch(
			page,
			'parallel-a',
			[{ action: 'update', id: media, fields: { halign: 'left' } }],
			before.gallery.revision
		),
		patch(
			page,
			'parallel-b',
			[{ action: 'update', id: media, fields: { halign: 'center' } }],
			before.gallery.revision
		),
	]);
	expect(outcomes.map((row) => row.status).sort()).toEqual([
		'conflict',
		'succeeded',
	]);
	const fresh = await native(page, 'modula/read-gallery', { id });
	const raced = await page.evaluate(
		async ({ id, media, prefix, revision }) => {
			const items = await window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/images`,
			});
			const ability = window.wp.apiFetch({
				path: '/wp-abilities/v1/abilities/modula/update-gallery-images/run',
				method: 'POST',
				data: {
					input: {
						request_id: prefix + 'race-api',
						id,
						revision,
						changes: [
							{
								action: 'update',
								id: media,
								fields: { halign: 'center' },
							},
						],
					},
				},
			});
			await new Promise((resolve) => setTimeout(resolve, 200));
			items.find((row) => row.id === media).halign = 'right';
			const editor = window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/upload/save-merged-items`,
				method: 'POST',
				data: { items },
			});
			return { ability: await ability, editor: await editor };
		},
		{ id, media, prefix, revision: fresh.gallery.revision }
	);
	expect(raced.ability.status).toBe('succeeded');
	expect(raced.editor.ok).toBe(true);
	expect(
		(await native(page, 'modula/read-gallery', { id })).items.find(
			(row) => row.id === media
		).halign
	).toBe('right');
	expect(
		await native(page, 'modula/recover-request', {
			request_id: prefix + 'race-api',
		})
	).toEqual(raced.ability);
	const saved = await page.evaluate(
		async ({ id, media }) => {
			const items = await window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/images`,
			});
			items.find((row) => row.id === media).halign = 'right';
			return window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/upload/save-merged-items`,
				method: 'POST',
				data: { items },
			});
		},
		{ id, media }
	);
	expect(saved.ok).toBe(true);
	expect(
		await patch(
			page,
			'editor-stale',
			[{ action: 'remove', id: media }],
			fresh.gallery.revision
		)
	).toMatchObject({ status: 'conflict', code: 'stale_revision' });
	await open(page);
	expect(
		(await native(page, 'modula/read-gallery', { id })).items.find(
			(row) => row.id === media
		).halign
	).toBe('right');
	const visitor = await evidence.anonymous();
	try {
		const denied = await visitor.request.post(
			`/wp-json/wp-abilities/v1/abilities/${operation}/run`,
			{ data: { input: result.input } }
		);
		expect([401, 403]).toContain(denied.status());
		const recovery = await visitor.request.get(
			`/wp-json/wp-abilities/v1/abilities/modula/recover-request/run?input[request_id]=${result.input.request_id}`
		);
		expect([401, 403]).toContain(recovery.status());
	} finally {
		await evidence.closeVisitor(visitor);
	}
	await testInfo.attach('concurrent-image-patches', {
		body: JSON.stringify({ outcomes, raced }, null, 2),
		contentType: 'application/json',
	});
});
