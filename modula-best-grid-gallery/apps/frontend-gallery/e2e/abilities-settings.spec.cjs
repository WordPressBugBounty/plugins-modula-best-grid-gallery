const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const mode = process.env.MODULA_E2E_MODE;
const runDir = process.env.MODULA_E2E_RUN_DIR;
const result = JSON.parse(
	fs.readFileSync(path.join(runDir, mode, 'abilities-settings.json'))
);
const catalog = JSON.parse(fs.readFileSync(path.join(runDir, 'catalog.json')));
const id = result.input.id;
const prefix = `${catalog.run}-${mode}-settings-`;
async function open(page) {
	await page.goto(result.outcome.gallery.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}
async function read(page) {
	return native(page, 'modula/read-gallery', { id });
}
async function patch(page, suffix, revision, settings, metadata) {
	return native(
		page,
		'modula/update-gallery',
		{
			request_id: prefix + suffix,
			id,
			revision,
			...(settings ? { settings } : {}),
			...(metadata ? { metadata } : {}),
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
test('native settings persist in the editor and anonymous appearance; real editor changes invalidate revisions', async ({
	page,
	evidence,
}) => {
	const nativeOnly = JSON.parse(
		fs.readFileSync(
			path.join(runDir, mode, 'abilities-settings-native-only.json')
		)
	);
	expect(nativeOnly.adapter_loaded).toBe(false);
	await open(page);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	await expect(
		page.getByRole('spinbutton', { name: 'Value', exact: true })
	).toHaveValue('23');
	const before = await read(page);
	const savedResponse = page.waitForResponse(
		(response) =>
			response.url().includes(`/modula/v2/gallery/${id}/settings`) &&
			response.request().method() !== 'GET' &&
			response.status() === 200
	);
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.fill('29');
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.press('Tab');
	await savedResponse;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
	expect(
		await patch(page, 'editor-stale', before.gallery.revision, {
			layout: { gutter: 44 },
		})
	).toMatchObject({ status: 'conflict', code: 'stale_revision' });
	await open(page);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	await expect(
		page.getByRole('spinbutton', { name: 'Value', exact: true })
	).toHaveValue('29');
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(catalog.pages.abilitySettings);
		await expect(
			publicPage.locator(`#modula-${id} .modula-masonry-react`)
		).toHaveCSS('gap', '29px');
		await expect(
			publicPage.locator(`#modula-${id} .modula-item`)
		).toHaveCount(6);
		await evidence.capture(
			publicPage,
			'ability-settings-public-appearance'
		);
		const denied = await visitor.request.post(
			'/wp-json/wp-abilities/v1/abilities/modula/update-gallery/run',
			{ data: { input: result.input } }
		);
		expect([401, 403]).toContain(denied.status());
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('simultaneous ability patches reject stale writers and serialize the editor across check/write', async ({
	page,
}, testInfo) => {
	await open(page);
	const before = await read(page);
	const outcomes = await Promise.all([
		patch(page, 'parallel-a', before.gallery.revision, {
			layout: { gutter: 31 },
		}),
		patch(page, 'parallel-b', before.gallery.revision, {
			layout: { gutter: 32 },
		}),
	]);
	expect(outcomes.map((row) => row.status).sort()).toEqual([
		'conflict',
		'succeeded',
	]);
	const fresh = await read(page);
	const raced = await page.evaluate(
		async ({ id, prefix, revision }) => {
			const ability = window.wp.apiFetch({
				path: '/wp-abilities/v1/abilities/modula/update-gallery/run',
				method: 'POST',
				data: {
					input: {
						request_id: prefix + 'race-api',
						id,
						revision,
						settings: { layout: { gutter: 37 } },
					},
				},
			});
			await new Promise((resolve) => setTimeout(resolve, 200));
			const editor = window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/settings`,
				method: 'PATCH',
				data: { layout: { gutter: 41 } },
			});
			return { ability: await ability, editor: await editor };
		},
		{ id, prefix, revision: fresh.gallery.revision }
	);
	expect(raced.ability.status).toBe('succeeded');
	expect(raced.editor.layout.gutter).toBe(41);
	expect((await read(page)).gallery.settings.layout.gutter).toBe(41);
	expect(
		await native(page, 'modula/recover-request', {
			request_id: prefix + 'race-api',
		})
	).toEqual(raced.ability);
	await testInfo.attach('real-concurrent-writers', {
		body: JSON.stringify({ outcomes, raced }, null, 2),
		contentType: 'application/json',
	});
});
test('official MCP preserves settings, Pro gates, publication, recovery and uncertain output', async ({
	page,
	evidence,
}, testInfo) => {
	await open(page);
	const initialized = await mcp(page, 'initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'Modula settings E2E', version: '1' },
	});
	const session = initialized.session;
	expect(session).toBeTruthy();
	try {
		const fresh = await call(page, 'modula/read-gallery', { id }, session);
		const input = {
			request_id: prefix + 'mcp',
			id,
			revision: fresh.gallery.revision,
			settings: { layout: { gutter: 35 } },
			metadata: { title: prefix + 'MCP title', status: 'publish' },
		};
		const out = await call(page, 'modula/update-gallery', input, session);
		expect(out.status).toBe('succeeded');
		expect(
			await call(page, 'modula/update-gallery', input, session)
		).toEqual(out);
		expect(
			await call(
				page,
				'modula/recover-request',
				{ request_id: input.request_id },
				session
			)
		).toEqual(out);
		expect(
			await call(
				page,
				'modula/update-gallery',
				{ ...input, settings: { layout: { gutter: 36 } } },
				session
			)
		).toMatchObject({
			status: 'conflict',
			code: 'request_payload_mismatch',
		});
		expect(
			await call(
				page,
				'modula/update-gallery',
				{
					...input,
					request_id: prefix + 'invalid-mcp',
					settings: {
						general: { type: 'invalid' },
						layout: { gutter: 21 },
					},
				},
				session
			)
		).toMatchObject({ status: 'rejected', code: 'invalid_input' });
		const current = await read(page);
		const pro = await call(
			page,
			'modula/update-gallery',
			{
				request_id: prefix + 'pro-mcp',
				id,
				revision: current.gallery.revision,
				settings: { general: { type: 'parallax-masonry' } },
			},
			session
		);
		expect(pro.status).toBe(mode === 'pro' ? 'succeeded' : 'rejected');
		await open(page);
		if (mode === 'pro') {
			await expect(
				page.getByRole('button', { name: 'Parallax', exact: true })
			).toBeVisible();
			const visitor = await evidence.anonymous();
			try {
				const publicPage = await visitor.newPage();
				await publicPage.goto(catalog.pages.abilitySettings);
				await expect(
					publicPage.locator(`#modula-${id} .modula-parallax-masonry`)
				).toBeVisible();
				await evidence.capture(publicPage, 'ability-pro-appearance');
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
		const confirmed = await read(page);
		const faultyInput = {
			request_id: prefix + 'http-output',
			id,
			revision: confirmed.gallery.revision,
			settings: { layout: { gutter: 39 } },
		};
		const faulty = await call(
			page,
			'modula/update-gallery',
			faultyInput,
			session
		);
		expect(faulty).toMatchObject({
			status: 'uncertain',
			code: 'output_validation_failed',
			operation: 'modula/update-gallery',
		});
		expect(
			await call(
				page,
				'modula/recover-request',
				{ request_id: faultyInput.request_id },
				session
			)
		).toEqual(faulty);
		expect(
			await call(page, 'modula/update-gallery', faultyInput, session)
		).toEqual(faulty);
		expect((await read(page)).gallery.settings.layout.gutter).toBe(39);
		const latest = await read(page);
		expect(
			(
				await patch(page, 'draft', latest.gallery.revision, null, {
					status: 'draft',
				})
			).gallery.status
		).toBe('draft');
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.abilitySettings);
			await expect(publicPage.locator(`#modula-${id}`)).toHaveCount(0);
		} finally {
			await evidence.closeVisitor(visitor);
		}
		await testInfo.attach('official-mcp-settings', {
			body: JSON.stringify({ out, pro, faulty }, null, 2),
			contentType: 'application/json',
		});
	} finally {
		const nonce = await page.evaluate(() => window.wpApiSettings.nonce);
		const terminated = await page.request.delete(
			'/wp-json/mcp/mcp-adapter-default-server',
			{
				headers: { 'X-WP-Nonce': nonce, 'Mcp-Session-Id': session },
				timeout: 15000,
			}
		);
		expect(terminated.ok()).toBe(true);
	}
});

test('settings mutations leave the shared visitor and editor baseline intact', async ({
	page,
	evidence,
}) => {
	await open(page);
	const baseline = catalog.galleries.visible;
	const current = await native(page, 'modula/read-gallery', {
		id: baseline.id,
	});
	expect.soft(current.gallery.status).toBe('publish');
	// Capture each mode's baseline: the editor journey intentionally continues
	// its saved Lite state in Pro when running the complete suite.
	expect
		.soft(current.gallery.settings.layout.gutter)
		.toBe(result.shared_baseline.gallery.settings.layout.gutter);
	expect
		.soft(current.gallery.settings.general.type)
		.toBe(result.shared_baseline.gallery.settings.general.type);
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(catalog.pages.visible);
		await expect(
			publicPage.locator(`#modula-${baseline.id} .modula-masonry-react`)
		).toBeVisible();
		await expect(
			publicPage.locator(`#modula-${baseline.id} .modula-item`)
		).toHaveCount(6);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
