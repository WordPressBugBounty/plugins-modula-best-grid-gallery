const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const fs = require('fs');
const path = require('path');
const dir = process.env.MODULA_E2E_RUN_DIR,
	mode = process.env.MODULA_E2E_MODE;
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'catalog.json')));
const result = JSON.parse(
	fs.readFileSync(path.join(dir, mode, 'abilities-presets.json'))
);
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
test('MCP preset CRUD and recoverable application retain editor composition and public output', async ({
	page,
	evidence,
}, testInfo) => {
	expect(
		JSON.parse(
			fs.readFileSync(
				path.join(dir, mode, 'abilities-presets-native-only.json')
			)
		).adapter_loaded
	).toBe(false);
	await page.goto(catalog.galleries.visible.editor);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Presets E2E', version: '1' },
		})
	).session;
	const request_id = process.env.MODULA_E2E_RUN + '-' + mode + '-mcp-preset';
	const input = {
		request_id,
		title: 'MCP preset',
		status: 'draft',
		settings: { layout: { gutter: 35 } },
		sorting: 'manual',
	};
	const created = await call(
		page,
		'modula/create-gallery-preset',
		input,
		session
	);
	if (mode === 'lite') {
		expect(created.status).toBe('forbidden');
		return;
	}
	expect(created.status).toBe('succeeded');
	expect(
		await call(page, 'modula/create-gallery-preset', input, session)
	).toEqual(created);
	const id = created.preset.id;
	const listed = await call(
		page,
		'modula/list-gallery-presets',
		{ page: 1, per_page: 100 },
		session
	);
	expect(listed.presets.some((row) => row.id === id)).toBe(true);
	const read = await call(
		page,
		'modula/read-gallery-preset',
		{ id },
		session
	);
	expect(read.preset.settings.layout.gutter).toBe(35);
	const updated = await call(
		page,
		'modula/update-gallery-preset',
		{
			request_id: request_id + '-update',
			id,
			revision: read.preset.revision,
			title: 'MCP updated preset',
			sorting: 'titleAZ',
			settings: { layout: { gutter: 38 } },
		},
		session
	);
	expect(updated.status).toBe('succeeded');
	const targets = [];
	const before = [];
	for (const target of result.targets) {
		const gallery = await call(
			page,
			'modula/read-gallery',
			{ id: target.id },
			session
		);
		before.push(gallery.items);
		targets.push({ id: target.id, revision: gallery.gallery.revision });
	}
	targets[1].revision = '0'.repeat(64);
	const apply = {
		request_id: request_id + '-apply',
		preset_id: id,
		preset_revision: updated.preset.revision,
		targets,
	};
	const out = await call(
		page,
		'modula/apply-gallery-presets',
		apply,
		session
	);
	expect(out.targets.map((row) => row.status)).toEqual([
		'succeeded',
		'conflict',
		'succeeded',
	]);
	expect(
		await call(
			page,
			'modula/recover-request',
			{ request_id: apply.request_id },
			session
		)
	).toEqual(out);
	expect(
		await call(page, 'modula/apply-gallery-presets', apply, session)
	).toEqual(out);
	await page.goto(out.targets[0].gallery.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const after = await native(page, 'modula/read-gallery', {
		id: targets[0].id,
	});
	expect(after.items).toEqual(before[0]);
	expect(after.gallery.settings.layout.gutter).toBe(38);
	await page.reload();
	expect(
		(await native(page, 'modula/read-gallery', { id: targets[0].id }))
			.gallery.settings.layout.gutter
	).toBe(38);
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(result.page);
		await expect(
			publicPage.locator(`#modula-${targets[0].id} .modula-item`)
		).toHaveCount(before[0].length);
		await publicPage
			.locator(`#modula-${targets[0].id}`)
			.scrollIntoViewIfNeeded();
		await evidence.capture(publicPage, 'preset-application-public');
		await evidence.capture(page, 'preset-application-editor');
		const denied = await visitor.request.post(
			'/wp-json/wp-abilities/v1/abilities/modula/apply-gallery-presets/run',
			{ data: { input: apply } }
		);
		expect([401, 403]).toContain(denied.status());
	} finally {
		await evidence.closeVisitor(visitor);
	}
	const failedConfirmation = await call(
		page,
		'modula/update-gallery-preset',
		{
			request_id: process.env.MODULA_E2E_RUN + '-pro-preset-http-output',
			id,
			revision: updated.preset.revision,
			title: 'Preset saved before lost confirmation',
		},
		session
	);
	expect(failedConfirmation.status).toBe('uncertain');
	expect(failedConfirmation.code).toBe('output_validation_failed');
	expect(
		(await call(page, 'modula/read-gallery-preset', { id }, session)).preset
			.title
	).toBe('Preset saved before lost confirmation');
	expect(
		await call(
			page,
			'modula/recover-request',
			{
				request_id:
					process.env.MODULA_E2E_RUN + '-pro-preset-http-output',
			},
			session
		)
	).toEqual(failedConfirmation);
	const current = await call(
		page,
		'modula/read-gallery-preset',
		{ id },
		session
	);
	const deletion = {
		request_id: request_id + '-delete',
		id,
		revision: current.preset.revision,
	};
	const deleted = await call(
		page,
		'modula/delete-gallery-preset',
		deletion,
		session
	);
	expect(deleted.status).toBe('succeeded');
	expect(
		await call(page, 'modula/delete-gallery-preset', deletion, session)
	).toEqual(deleted);
	expect(
		await call(
			page,
			'modula/recover-request',
			{ request_id: deletion.request_id },
			session
		)
	).toEqual(deleted);
	await testInfo.attach('preset-mcp-outcomes', {
		body: JSON.stringify({ created, updated, out, deleted }, null, 2),
		contentType: 'application/json',
	});
});
