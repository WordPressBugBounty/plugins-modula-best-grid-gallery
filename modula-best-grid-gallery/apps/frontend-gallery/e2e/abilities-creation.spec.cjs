const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const mode = process.env.MODULA_E2E_MODE;
const runDir = process.env.MODULA_E2E_RUN_DIR;
const result = JSON.parse(
	fs.readFileSync(path.join(runDir, mode, 'abilities-creation.json'))
);
const catalog = JSON.parse(fs.readFileSync(path.join(runDir, 'catalog.json')));
const prefix = `${catalog.run}-${mode}-`;
async function openEditor(page, gallery = result.draft.gallery) {
	await page.goto(gallery.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}
async function execute(page, name, input, session) {
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
test('native-created galleries reopen with ordered images and explicit publication', async ({
	page,
	evidence,
}, testInfo) => {
	const nativeOnly = JSON.parse(
		fs.readFileSync(
			path.join(runDir, mode, 'abilities-creation-native-only.json')
		)
	);
	expect(nativeOnly.adapter_loaded).toBe(false);
	expect(nativeOnly.native).toEqual(result.draft);
	for (const outcome of [result.draft, result.published]) {
		await openEditor(page, outcome.gallery);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		const rows = await page.evaluate(
			async (id) =>
				window.wp.apiFetch({ path: `/modula/v2/gallery/${id}/images` }),
			outcome.gallery.id
		);
		expect(rows.map((row) => row.id)).toEqual(result.input.attachment_ids);
		await evidence.flush();
		await page.reload();
		await expect(
			page.getByRole('navigation', { name: 'Settings sections' })
		).toBeVisible();
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		await evidence.flush();
	}
	expect(result.draft.gallery.public_url).toBeUndefined();
	if (mode === 'pro')
		expect(result.published.gallery.public_url).toBeTruthy();
	else expect(result.published.gallery.public_url).toBeUndefined();
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(result.page);
		await expect(publicPage.locator('body')).not.toHaveClass(/logged-in/);
		const root = publicPage.locator(
			`#modula-${result.published.gallery.id}`
		);
		await expect(root.locator('.modula-item')).toHaveCount(2);
		await expect(root.locator('.modula-item img')).toHaveCount(2);
		for (const img of await root.locator('.modula-item img').all()) {
			await expect(img).toBeVisible();
			await expect
				.poll(() =>
					img.evaluate((el) => el.complete && el.naturalWidth > 0)
				)
				.toBe(true);
		}
		await evidence.capture(publicPage, 'ability-published-shortcode');
		if (mode === 'pro') {
			await publicPage.goto(result.published.gallery.public_url);
			await expect(
				publicPage.locator(
					`#modula-${result.published.gallery.id} .modula-item`
				)
			).toHaveCount(2);
		}
		await publicPage.goto(result.draft_page);
		await expect(
			publicPage.locator(`#modula-${result.draft.gallery.id}`)
		).toHaveCount(0);
		const deniedCreate = await visitor.request.post(
			'/wp-json/wp-abilities/v1/abilities/modula/create-gallery/run',
			{ data: { input: result.input } }
		);
		expect([401, 403]).toContain(deniedCreate.status());
		const deniedRecovery = await visitor.request.get(
			`/wp-json/wp-abilities/v1/abilities/modula/recover-request/run?input[request_id]=${result.input.request_id}`
		);
		expect([401, 403]).toContain(deniedRecovery.status());
	} finally {
		await evidence.closeVisitor(visitor);
	}
	await testInfo.attach('native-creation-recovery', {
		body: JSON.stringify(result, null, 2),
		contentType: 'application/json',
	});
});
test('concurrent native requests and discarded responses produce one recoverable gallery', async ({
	page,
}, testInfo) => {
	await openEditor(page);
	const input = {
		...result.input,
		request_id: prefix + 'concurrent',
		title: prefix + 'concurrent',
	};
	const outcomes = await Promise.all(
		Array.from({ length: 4 }, () =>
			native(page, 'modula/create-gallery', input, 'POST')
		)
	);
	for (const outcome of outcomes)
		expect(['succeeded', 'in_progress']).toContain(outcome.status);
	const recovered = await native(page, 'modula/recover-request', {
		request_id: input.request_id,
	});
	expect(recovered.status).toBe('succeeded');
	for (const outcome of outcomes.filter((row) => row.status === 'succeeded'))
		expect(outcome).toEqual(recovered);
	const listed = await native(page, 'modula/list-galleries', {
		search: input.title,
	});
	expect(listed.galleries.map((row) => row.id)).toEqual([
		recovered.gallery.id,
	]);
	// Discard the actual HTTP response at the client boundary, after the server completed.
	const lost = {
		...input,
		request_id: prefix + 'lost',
		title: prefix + 'lost',
	};
	await page.route(
		'**/wp-abilities/v1/abilities/modula/create-gallery/run',
		async (route) => {
			await route.fetch();
			await route.abort('failed');
		}
	);
	await page.evaluate(async (input) => {
		try {
			await window.wp.apiFetch({
				path: '/wp-abilities/v1/abilities/modula/create-gallery/run',
				method: 'POST',
				data: { input },
			});
		} catch (error) {
			return error.code || 'connection_lost';
		}
	}, lost);
	await page.unroute(
		'**/wp-abilities/v1/abilities/modula/create-gallery/run'
	);
	const lostRecovered = await native(page, 'modula/recover-request', {
		request_id: lost.request_id,
	});
	expect(lostRecovered.status).toBe('succeeded');
	expect(await native(page, 'modula/create-gallery', lost, 'POST')).toEqual(
		lostRecovered
	);
	const lostList = await native(page, 'modula/list-galleries', {
		search: lost.title,
	});
	expect(lostList.galleries.map((row) => row.id)).toEqual([
		lostRecovered.gallery.id,
	]);
	await testInfo.attach('concurrency-and-response-loss', {
		body: JSON.stringify({ outcomes, recovered, lostRecovered }, null, 2),
		contentType: 'application/json',
	});
});
test('official MCP preserves validation, conflicts and recoverable uncertain outcomes', async ({
	page,
}, testInfo) => {
	await openEditor(page);
	const initialized = await mcp(page, 'initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'Modula owned creation E2E', version: '1' },
	});
	expect(initialized.status).toBe(200);
	const session = initialized.session;
	expect(session).toBeTruthy();
	try {
		const input = {
			...result.input,
			request_id: prefix + 'mcp',
			title: prefix + 'mcp',
		};
		const created = await execute(
			page,
			'modula/create-gallery',
			input,
			session
		);
		expect(created.status).toBe('succeeded');
		expect(
			await execute(page, 'modula/create-gallery', input, session)
		).toEqual(created);
		expect(
			await execute(
				page,
				'modula/recover-request',
				{ request_id: input.request_id },
				session
			)
		).toEqual(created);
		const faultyInput = {
			...result.input,
			request_id: prefix + 'http-output',
			title: prefix + 'http-output',
		};
		const failedConfirmation = await execute(
			page,
			'modula/create-gallery',
			faultyInput,
			session
		);
		expect(failedConfirmation).toMatchObject({
			status: 'uncertain',
			code: 'output_validation_failed',
		});
		expect(failedConfirmation.gallery.id).toBeGreaterThan(0);
		expect(
			await execute(
				page,
				'modula/recover-request',
				{ request_id: faultyInput.request_id },
				session
			)
		).toEqual(failedConfirmation);
		expect(
			await execute(page, 'modula/create-gallery', faultyInput, session)
		).toEqual(failedConfirmation);
		const conflict = await execute(
			page,
			'modula/create-gallery',
			{ ...input, title: 'Different payload' },
			session
		);
		expect(conflict).toMatchObject({
			status: 'conflict',
			code: 'request_payload_mismatch',
			request_id: input.request_id,
		});
		const invalid = { ...input, request_id: prefix + 'invalid' };
		delete invalid.status;
		const rejected = await execute(
			page,
			'modula/create-gallery',
			invalid,
			session
		);
		expect(rejected).toMatchObject({
			status: 'rejected',
			code: 'invalid_input',
		});
		expect(rejected.message).toContain('status');
		const uncertain = await execute(
			page,
			'modula/recover-request',
			{ request_id: result.output_failure.request_id },
			session
		);
		expect(uncertain).toEqual(result.output_failure);
		expect(uncertain.reconciliation).toContain('Do not repeat');
		const uncertainReplay = await execute(
			page,
			'modula/create-gallery',
			{ ...result.input, request_id: result.output_failure.request_id },
			session
		);
		expect(uncertainReplay).toEqual(uncertain);
		const interrupted = await execute(
			page,
			'modula/recover-request',
			{ request_id: result.interrupted.request_id },
			session
		);
		expect(interrupted).toEqual(result.interrupted);
		await openEditor(page, created.gallery);
		const read = await native(page, 'modula/read-gallery', {
			id: created.gallery.id,
		});
		expect(read.items.map((row) => row.id)).toEqual(input.attachment_ids);
		await testInfo.attach('mcp-creation-recovery', {
			body: JSON.stringify(
				{
					created,
					conflict,
					rejected,
					uncertain,
					interrupted,
					failedConfirmation,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	} finally {
		const nonce = await page.evaluate(() => window.wpApiSettings.nonce);
		const terminated = await page.request.delete(
			'/wp-json/mcp/mcp-adapter-default-server',
			{ headers: { 'X-WP-Nonce': nonce, 'Mcp-Session-Id': session } }
		);
		expect(terminated.ok()).toBe(true);
	}
});
