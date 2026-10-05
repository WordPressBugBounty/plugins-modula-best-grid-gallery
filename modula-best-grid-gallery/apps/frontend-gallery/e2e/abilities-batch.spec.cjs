const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const fs = require('fs');
const path = require('path');
const dir = process.env.MODULA_E2E_RUN_DIR,
	mode = process.env.MODULA_E2E_MODE;
const result = JSON.parse(
	fs.readFileSync(path.join(dir, mode, 'abilities-batch.json'))
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
test('MCP mixed batch recovers target outcomes and retains editor and public results', async ({
	page,
	evidence,
}, testInfo) => {
	expect(
		JSON.parse(
			fs.readFileSync(
				path.join(dir, mode, 'abilities-batch-native-only.json')
			)
		).adapter_loaded
	).toBe(false);
	const id = result.input.targets[0].id;
	await page.goto(result.outcome.targets[0].gallery.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Batch E2E', version: '1' },
		})
	).session;
	const visitor = await evidence.anonymous();
	try {
		const targets = [];
		for (const row of result.input.targets) {
			const read = await call(
				page,
				'modula/read-gallery',
				{ id: row.id },
				session
			);
			targets.push({
				id: row.id,
				revision: read.gallery.revision,
				settings: { layout: { gutter: 37 } },
			});
		}
		targets[1].settings.layout.gutter = 'invalid';
		targets[2].revision = '0'.repeat(64);
		const input = { request_id: result.input.request_id + '-mcp', targets };
		const out = await call(page, 'modula/update-galleries', input, session);
		expect(out.status).toBe('partial');
		expect(out.targets.map((row) => row.status)).toEqual([
			'succeeded',
			'rejected',
			'conflict',
		]);
		expect(
			await call(page, 'modula/update-galleries', input, session)
		).toEqual(out);
		expect(
			await call(
				page,
				'modula/recover-request',
				{ request_id: input.request_id },
				session
			)
		).toEqual(out);
		await page.reload();
		await expect(
			page.getByRole('navigation', { name: 'Settings sections' })
		).toBeVisible();
		expect(
			(await native(page, 'modula/read-gallery', { id })).gallery.settings
				.layout.gutter
		).toBe(37);
		const publicPage = await visitor.newPage();
		await publicPage.goto(result.page);
		await expect(
			publicPage.locator(`#modula-${id} .modula-item`)
		).toHaveCount(1);
		await evidence.capture(page, 'batch-editor-reopened');
		await publicPage.locator(`#modula-${id}`).scrollIntoViewIfNeeded();
		await evidence.capture(publicPage, 'batch-anonymous');
		const denied = await visitor.request.post(
			'/wp-json/wp-abilities/v1/abilities/modula/update-galleries/run',
			{ data: { input } }
		);
		expect([401, 403]).toContain(denied.status());
		const current = await call(
			page,
			'modula/read-gallery',
			{ id },
			session
		);
		const concurrentInput = {
			request_id: input.request_id + '-concurrent',
			targets: [
				{
					id,
					revision: current.gallery.revision,
					settings: { layout: { gutter: 38 } },
				},
			],
		};
		const concurrent = await Promise.all([
			call(page, 'modula/update-galleries', concurrentInput, session),
			call(page, 'modula/update-galleries', concurrentInput, session),
		]);
		expect(
			concurrent.every((row) =>
				['succeeded', 'in_progress'].includes(row.status)
			)
		).toBe(true);
		expect(
			(
				await call(
					page,
					'modula/recover-request',
					{ request_id: concurrentInput.request_id },
					session
				)
			).status
		).toBe('succeeded');
		expect(
			(await native(page, 'modula/read-gallery', { id })).gallery.settings
				.layout.gutter
		).toBe(38);
		await testInfo.attach('batch-mcp-outcomes', {
			body: JSON.stringify(out, null, 2),
			contentType: 'application/json',
		});
	} finally {
		await evidence.closeVisitor(visitor);
		const nonce = await page.evaluate(() => window.wpApiSettings.nonce);
		await page.request.delete('/wp-json/mcp/mcp-adapter-default-server', {
			headers: { 'X-WP-Nonce': nonce, 'Mcp-Session-Id': session },
		});
	}
});
