const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const fs = require('fs');
const path = require('path');
const dir = process.env.MODULA_E2E_RUN_DIR,
	mode = process.env.MODULA_E2E_MODE;
const result = JSON.parse(
	fs.readFileSync(path.join(dir, mode, 'abilities-lifecycle.json'))
);
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'catalog.json')));
const prefix = `${catalog.run}-${mode}-lifecycle-http-`;
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
test('MCP lifecycle preserves editor composition, hides/restores album members and recovers deletion', async ({
	page,
	evidence,
}, testInfo) => {
	expect(
		JSON.parse(
			fs.readFileSync(
				path.join(dir, mode, 'abilities-lifecycle-native-only.json')
			)
		).adapter_loaded
	).toBe(false);
	const id = result.outcome.gallery.id;
	await page.goto(result.outcome.gallery.editor_url);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const read = await native(page, 'modula/read-gallery', { id });
	await page.reload();
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	expect((await native(page, 'modula/read-gallery', { id })).items).toEqual(
		read.items
	);
	const initialized = await mcp(page, 'initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'Lifecycle E2E', version: '1' },
	});
	const session = initialized.session;
	expect(session).toBeTruthy();
	const visitor = await evidence.anonymous();
	const outcomes = [];
	try {
		const publicPage = await visitor.newPage();
		async function act(name, suffix, extra = {}) {
			const fresh = await call(
				page,
				'modula/read-gallery',
				{ id },
				session
			);
			const input = {
				request_id: prefix + suffix,
				id,
				revision: fresh.gallery.revision,
				...extra,
			};
			const out = await call(
				page,
				`modula/${name}-gallery`,
				input,
				session
			);
			outcomes.push(out);
			expect(out.status).toBe('succeeded');
			return { out, input };
		}
		async function members() {
			return page.evaluate(
				async (album) =>
					window.wp.apiFetch({
						path: `/modula/v2/album/${album}/members`,
					}),
				result.album
			);
		}
		await act('trash', 'trash');
		if (result.album) expect((await members()).members).toHaveLength(0);
		await act('restore', 'restore', { status: 'publish' });
		await publicPage.goto(result.page);
		await expect(
			publicPage.locator(`#modula-${id} .modula-item`)
		).toHaveCount(read.items.length);
		await publicPage.locator(`#modula-${id}`).scrollIntoViewIfNeeded();
		await evidence.capture(publicPage, 'restored-gallery-public');
		if (result.album) {
			expect((await members()).members.map((row) => row.id)).toContain(
				id
			);
			await publicPage.goto(result.album_page);
			await expect(
				publicPage.locator(`#jtg-album-${result.album} .modula-item`)
			).toHaveCount(1);
			await act('trash', 'trash-again');
			await publicPage.reload();
			await expect(
				publicPage.locator(`#jtg-album-${result.album} .modula-item`)
			).toHaveCount(0);
			await act('restore', 'restore-again', { status: 'publish' });
			await publicPage.reload();
			await expect(
				publicPage.locator(`#jtg-album-${result.album} .modula-item`)
			).toHaveCount(1);
		}
		const source = await call(page, 'modula/read-gallery', { id }, session);
		const duplicateInput = {
			request_id: prefix + 'duplicate',
			id,
			revision: source.gallery.revision,
			status: 'draft',
		};
		const concurrentCopies = await Promise.all([
			call(page, 'modula/duplicate-gallery', duplicateInput, session),
			call(page, 'modula/duplicate-gallery', duplicateInput, session),
		]);
		expect(
			concurrentCopies.every((row) =>
				['succeeded', 'in_progress'].includes(row.status)
			)
		).toBe(true);
		const copy = await call(
			page,
			'modula/recover-request',
			{ request_id: duplicateInput.request_id },
			session
		);
		expect(copy.status).toBe('succeeded');
		expect(
			await call(
				page,
				'modula/duplicate-gallery',
				duplicateInput,
				session
			)
		).toEqual(copy);
		const copyRead = await call(
			page,
			'modula/read-gallery',
			{ id: copy.gallery.id },
			session
		);
		expect(copyRead.items).toEqual(source.items);
		expect(copyRead.gallery.status).toBe('draft');
		expect(
			(
				await call(
					page,
					'modula/delete-gallery',
					{
						request_id: prefix + 'delete-copy',
						id: copy.gallery.id,
						revision: copyRead.gallery.revision,
					},
					session
				)
			).status
		).toBe('succeeded');
		const deleted = await act('delete', 'delete');
		expect(
			await call(page, 'modula/delete-gallery', deleted.input, session)
		).toEqual(deleted.out);
		expect(
			await call(
				page,
				'modula/recover-request',
				{ request_id: deleted.input.request_id },
				session
			)
		).toEqual(deleted.out);
		if (result.album) expect((await members()).members).toHaveLength(0);
		const denied = await visitor.request.delete(
			'/wp-json/wp-abilities/v1/abilities/modula/delete-gallery/run?' +
				new URLSearchParams(
					Object.entries(deleted.input).map(([key, value]) => [
						`input[${key}]`,
						String(value),
					])
				)
		);
		expect([401, 403], await denied.text()).toContain(denied.status());
		await publicPage.goto(result.page);
		await expect(
			publicPage.locator(`#modula-${id} .modula-item`)
		).toHaveCount(0);
		await testInfo.attach('lifecycle-outcomes', {
			body: JSON.stringify(outcomes, null, 2),
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
