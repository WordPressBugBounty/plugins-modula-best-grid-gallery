const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const mode = process.env.MODULA_E2E_MODE;
const runDir = process.env.MODULA_E2E_RUN_DIR;
const result = JSON.parse(
	fs.readFileSync(path.join(runDir, mode, 'abilities-embedded.json'))
);
const catalog = JSON.parse(fs.readFileSync(path.join(runDir, 'catalog.json')));
const id = result.input.id;
const operation = 'modula/update-gallery-items';
const prefix = `${catalog.run}-${mode}-embedded-`;
async function open(page) {
	await page.goto(result.outcome.gallery.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}
async function patch(page, suffix, item_changes, revision) {
	const read = revision
		? null
		: await native(page, 'modula/read-gallery', { id });
	return native(
		page,
		operation,
		{
			request_id: prefix + suffix,
			id,
			revision: revision || read.gallery.revision,
			item_changes,
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
test('native mixed content survives editor save and reopen with anonymous order and presentation', async ({
	page,
	evidence,
}) => {
	expect(
		JSON.parse(
			fs.readFileSync(
				path.join(runDir, mode, 'abilities-embedded-native-only.json')
			)
		).adapter_loaded
	).toBe(false);
	await open(page);
	await expect(
		page.getByText('Final body safe', { exact: true })
	).toBeVisible();
	await expect(
		page.getByText('Shortcode body', { exact: true })
	).toBeVisible();
	const tiles = page.locator('.modula-custom-grid__rgl .react-grid-item');
	await expect(tiles).toHaveCount(3);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const save = page.waitForResponse(
		(response) =>
			response.url().includes(`/modula/v2/gallery/${id}/settings`) &&
			response.request().method() !== 'GET' &&
			response.status() === 200
	);
	const gutter = page.getByRole('spinbutton', { name: 'Value', exact: true });
	await gutter.fill('12');
	await gutter.press('Tab');
	await save;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
	await open(page);
	const saved = await native(page, 'modula/read-gallery', { id });
	expect(saved.items).toEqual(result.final.items);
	await expect(tiles).toHaveCount(3);
	await evidence.capture(page, 'mixed-editor-reopened');
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(result.page);
		const publicTiles = publicPage.locator(
			`#modula-${id} .modula-item-tiled`
		);
		await expect(publicTiles).toHaveCount(3);
		await expect(publicTiles.nth(0)).toContainText('Updated block');
		await expect(publicTiles.nth(0)).toContainText('Final body safe');
		await expect(publicTiles.nth(2)).toContainText('Shortcode body');
		const boxes = await publicTiles.evaluateAll((rows) =>
			rows.map((row) => {
				const b = row.getBoundingClientRect();
				return { x: b.x, y: b.y, width: b.width, height: b.height };
			})
		);
		expect(boxes[0].width).toBeGreaterThan(boxes[1].width * 1.8);
		expect(boxes[0].x).toBeGreaterThan(boxes[1].x);
		expect(boxes[2].x).toBeGreaterThan(boxes[0].x);
		const presentation = await publicTiles.nth(0).evaluate((row) => {
			const content = row.querySelector('.modula-content-block') || row;
			return {
				text: getComputedStyle(content).color,
				html: row.innerHTML,
			};
		});
		expect(presentation.html).toContain('rgba(12, 34, 56, 0.5)');
		await evidence.capture(publicPage, 'mixed-anonymous-custom-grid');
		const media = await page.evaluate(
			async (mediaId) =>
				window.wp.apiFetch({
					path: `/wp/v2/media/${mediaId}?context=edit`,
				}),
			catalog.attachments[0].id
		);
		expect(media.title.raw).toBe(result.shared[0].post_title);
		expect(media.caption.raw).toBe(result.shared[0].post_excerpt);
		expect(media.description.raw).toBe(result.shared[0].post_content);
		expect(media.alt_text).toBe(result.shared[1]);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
test('official MCP authors from a partial read and recovers original and uncertain outcomes', async ({
	page,
}, testInfo) => {
	await open(page);
	const initialized = await mcp(page, 'initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'Modula mixed items E2E', version: '1' },
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
		const input = {
			request_id: prefix + 'mcp',
			id,
			revision: before.gallery.revision,
			item_changes: [
				{
					action: 'add',
					id: 'mcp-shortcode',
					kind: 'shortcode',
					before_id: 'block-one',
					fields: {
						shortcodeRaw: '[caption width="120"]MCP body[/caption]',
					},
				},
				{
					action: 'update',
					id: 'mcp-shortcode',
					fields: {
						shortcodeRaw:
							'[caption width="120"]MCP updated[/caption]',
						width: 3,
					},
				},
				{
					action: 'move',
					id: 'mcp-shortcode',
					before_id: 'shortcode-one',
				},
			],
		};
		const out = await call(page, operation, input, session);
		expect(out.status).toBe('succeeded');
		const saved = await call(page, 'modula/read-gallery', { id }, session);
		expect(saved.items.map((row) => row.id)).toEqual([
			'block-one',
			catalog.attachments[0].id,
			'mcp-shortcode',
			'shortcode-one',
		]);
		expect(saved.items[2].shortcodeRaw).toContain('MCP updated');
		expect(saved.items[2].width).toBe(3);
		const invalid = await call(
			page,
			operation,
			{
				...input,
				request_id: prefix + 'mcp-invalid',
				revision: saved.gallery.revision,
				item_changes: [
					{ action: 'remove', id: 'mcp-shortcode' },
					{
						action: 'update',
						id: 'block-one',
						fields: { shortcodeRaw: 'wrong kind' },
					},
				],
			},
			session
		);
		expect(invalid.status).toBe('rejected');
		expect(
			(await call(page, 'modula/read-gallery', { id }, session)).items
		).toEqual(saved.items);
		const removed = await call(
			page,
			operation,
			{
				...input,
				request_id: prefix + 'mcp-remove',
				revision: saved.gallery.revision,
				item_changes: [{ action: 'remove', id: 'mcp-shortcode' }],
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
			(await call(page, 'modula/read-gallery', { id }, session)).items
		).toEqual(result.final.items);
		const fresh = await call(page, 'modula/read-gallery', { id }, session);
		const faultyInput = {
			...input,
			request_id: prefix + 'http-output',
			revision: fresh.gallery.revision,
			item_changes: [
				{
					action: 'add',
					id: 'unconfirmed-block',
					kind: 'content_block',
					fields: { title: 'Saved once' },
				},
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
			).items.filter((row) => row.id === 'unconfirmed-block')
		).toHaveLength(1);
		expect(
			(
				await patch(page, 'remove-unconfirmed', [
					{ action: 'remove', id: 'unconfirmed-block' },
				])
			).status
		).toBe('succeeded');
		await testInfo.attach('official-mcp-mixed-items', {
			body: JSON.stringify({ out, invalid, removed, faulty }, null, 2),
			contentType: 'application/json',
		});
	} finally {
		const nonce = await page.evaluate(() => window.wpApiSettings.nonce);
		expect(
			(
				await page.request.delete(
					'/wp-json/mcp/mcp-adapter-default-server',
					{
						headers: {
							'X-WP-Nonce': nonce,
							'Mcp-Session-Id': session,
						},
						timeout: 15000,
					}
				)
			).ok()
		).toBe(true);
	}
});
test('concurrent patches and ordinary editor writes retain identities and enforce current access', async ({
	page,
	evidence,
}) => {
	await open(page);
	const before = await native(page, 'modula/read-gallery', { id });
	const outcomes = await Promise.all([
		patch(
			page,
			'parallel-a',
			[
				{
					action: 'update',
					id: 'block-one',
					fields: { title: 'Parallel A' },
				},
			],
			before.gallery.revision
		),
		patch(
			page,
			'parallel-b',
			[
				{
					action: 'update',
					id: 'block-one',
					fields: { title: 'Parallel B' },
				},
			],
			before.gallery.revision
		),
	]);
	expect(outcomes.map((row) => row.status).sort()).toEqual([
		'conflict',
		'succeeded',
	]);
	const fresh = await native(page, 'modula/read-gallery', { id });
	const raced = await page.evaluate(
		async ({ id, prefix, revision, operation }) => {
			const items = await window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/images`,
			});
			const ability = window.wp.apiFetch({
				path: `/wp-abilities/v1/abilities/${operation}/run`,
				method: 'POST',
				data: {
					input: {
						request_id: prefix + 'race-api',
						id,
						revision,
						item_changes: [
							{
								action: 'update',
								id: 'block-one',
								fields: { title: 'Ability title' },
							},
						],
					},
				},
			});
			await new Promise((resolve) => setTimeout(resolve, 200));
			items.find((row) => row.id === 'block-one').title = 'Editor title';
			const editor = window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/upload/save-merged-items`,
				method: 'POST',
				data: { items },
			});
			return { ability: await ability, editor: await editor };
		},
		{ id, prefix, revision: fresh.gallery.revision, operation }
	);
	expect(raced.ability.status).toBe('succeeded');
	expect(raced.editor.ok).toBe(true);
	expect(
		(await native(page, 'modula/read-gallery', { id })).items[0].title
	).toBe('Editor title');
	expect(
		await native(page, 'modula/recover-request', {
			request_id: prefix + 'race-api',
		})
	).toEqual(raced.ability);
	expect(
		await patch(
			page,
			'editor-stale',
			[{ action: 'remove', id: 'block-one' }],
			fresh.gallery.revision
		)
	).toMatchObject({ status: 'conflict', code: 'stale_revision' });
	const current = await native(page, 'modula/read-gallery', { id });
	const changes = [
		{ action: 'add', id: 'concurrent-block', kind: 'content_block' },
	];
	const same = await Promise.all([
		patch(page, 'same', changes, current.gallery.revision),
		patch(page, 'same', changes, current.gallery.revision),
	]);
	expect(same.some((row) => row.status === 'succeeded')).toBe(true);
	expect(
		same.every((row) => ['succeeded', 'in_progress'].includes(row.status))
	).toBe(true);
	expect(
		(await native(page, 'modula/read-gallery', { id })).items.filter(
			(row) => row.id === 'concurrent-block'
		)
	).toHaveLength(1);
	await open(page);
	await expect(page.getByText('Editor title', { exact: true })).toBeVisible();
	const visitor = await evidence.anonymous();
	try {
		const denied = await visitor.request.post(
			`/wp-json/wp-abilities/v1/abilities/${operation}/run`,
			{ data: { input: result.input } }
		);
		expect([401, 403]).toContain(denied.status());
		const mcpDenied = await visitor.request.post(
			'/wp-json/mcp/mcp-adapter-default-server',
			{
				headers: { 'X-Modula-E2E-Run': catalog.run },
				data: {
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: {
						name: 'mcp-adapter-execute-ability',
						arguments: {
							ability_name: operation,
							parameters: result.input,
						},
					},
				},
			}
		);
		expect([401, 403]).toContain(mcpDenied.status());
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
