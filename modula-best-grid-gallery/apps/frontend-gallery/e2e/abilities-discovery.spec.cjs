const fs = require('fs');
const path = require('path');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const { test, expect } = require('./evidence.cjs');
const runDir = process.env.MODULA_E2E_RUN_DIR;
const result = JSON.parse(
	fs.readFileSync(
		path.join(
			runDir,
			process.env.MODULA_E2E_MODE,
			'abilities-discovery.json'
		)
	)
);
const catalog = JSON.parse(fs.readFileSync(path.join(runDir, 'catalog.json')));
const names = [
	'modula/discover',
	'modula/list-galleries',
	'modula/read-gallery',
];
function expectRetainedReadPayload(read) {
	// Other suite journeys change shared storage/extension state, which is part
	// of a gallery revision. Compare retained content, then prove current native
	// and MCP revisions agree instead of freezing the pre-suite revision.
	expect(read.gallery.revision).toMatch(/^[a-f0-9]{64}$/);
	expect(read).toEqual({
		...result.read,
		gallery: { ...result.read.gallery, revision: read.gallery.revision },
	});
}
async function openEditor(page) {
	await page.goto(catalog.galleries.visible.editor);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}
test('native discovery and Beta reads are bounded, pure and permission-aware', async ({
	page,
}, testInfo) => {
	expect(result.native.schema_version).toBe('1');
	expect(
		result.native.operations
			.filter((row) => row.status === 'available')
			.map((row) => row.name)
	).toEqual(expect.arrayContaining(names));
	expect(result.pure_read).toBe(true);
	expect(result.denied_current_capability).toBe(true);
	expect(result.denied_subscriber).toBe(true);
	const nativeOnly = JSON.parse(
		fs.readFileSync(
			path.join(
				runDir,
				process.env.MODULA_E2E_MODE,
				'abilities-native-without-mcp.json'
			)
		)
	);
	expect(nativeOnly.adapter_loaded).toBe(false);
	expect(nativeOnly.native.schema_version).toBe('1');
	await openEditor(page);
	const discover = await native(page, names[0], { per_page: 100 });
	expect(discover.schema_version).toBe('1');
	const listed = await native(page, names[1], {
		search: `abilities pure read ${process.env.MODULA_E2E_MODE}`,
		status: 'draft',
		per_page: 1,
	});
	expect(listed.galleries.map((row) => row.id)).toContain(result.id);
	const read = await native(page, names[2], { id: result.id, per_page: 1 });
	expectRetainedReadPayload(read);
	expect(await native(page, names[2], { id: result.id, per_page: 1 })).toEqual(
		read
	);
	expect(JSON.stringify(read)).not.toContain('ability-secret');
	await testInfo.attach('native-ability-contracts', {
		body: JSON.stringify(result, null, 2),
		contentType: 'application/json',
	});
});
test('official MCP discovery, schemas and execution reach the same Beta reads', async ({
	page,
}, testInfo) => {
	await openEditor(page);
	const initialized = await mcp(page, 'initialize', {
		protocolVersion: '2025-06-18',
		capabilities: {},
		clientInfo: { name: 'Modula owned E2E', version: '1' },
	});
	expect(initialized.status).toBe(200);
	expect(initialized.session).toBeTruthy();
	const session = initialized.session;
	try {
		const discovered = toolData(
			await mcp(
				page,
				'tools/call',
				{ name: 'mcp-adapter-discover-abilities', arguments: {} },
				session
			)
		);
		expect(discovered.abilities.map((row) => row.name)).toEqual(
			expect.arrayContaining(names)
		);
		const featureDiscovery = toolData(
			await mcp(
				page,
				'tools/call',
				{
					name: 'mcp-adapter-execute-ability',
					arguments: {
						ability_name: names[0],
						parameters: { per_page: 100 },
					},
				},
				session
			)
		);
		expect(featureDiscovery.success).toBe(true);
		expect(featureDiscovery.data.features.compatible_pro).toBe(
			process.env.MODULA_E2E_MODE === 'pro'
		);
		expect(
			featureDiscovery.data.operations.some(
				(row) => row.status === 'planned'
			)
		).toBe(true);
		expect(discovered.abilities.map((row) => row.name)).toContain(
			'modula/create-gallery'
		);
		const info = toolData(
			await mcp(
				page,
				'tools/call',
				{
					name: 'mcp-adapter-get-ability-info',
					arguments: { ability_name: names[2] },
				},
				session
			)
		);
		expect(JSON.stringify(info)).toContain('per_page');
		const executed = toolData(
			await mcp(
				page,
				'tools/call',
				{
					name: 'mcp-adapter-execute-ability',
					arguments: {
						ability_name: names[2],
						parameters: { id: result.id, per_page: 1 },
					},
				},
				session
			)
		);
		expect(executed.success).toBe(true);
		expectRetainedReadPayload(executed.data);
		expect(executed.data).toEqual(
			await native(page, names[2], { id: result.id, per_page: 1 })
		);
		const classic = await mcp(
			page,
			'tools/call',
			{
				name: 'mcp-adapter-execute-ability',
				arguments: {
					ability_name: names[2],
					parameters: { id: catalog.galleries.classic.id },
				},
			},
			session
		);
		expect(JSON.stringify(classic)).not.toContain(
			catalog.galleries.classic.editor
		);
		expect(
			classic.body.result?.isError ||
				classic.body.error ||
				classic.body.result?.structuredContent?.success === false
		).toBeTruthy();
		await testInfo.attach('official-mcp-contracts', {
			body: JSON.stringify(
				{
					initialized: initialized.body,
					discovered,
					info,
					executed,
					classic,
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
test('anonymous callers cannot obtain protected native or MCP results', async ({
	page,
	evidence,
}) => {
	await openEditor(page);
	const visitor = await evidence.anonymous();
	try {
		const read = await visitor.request.get(
			`/wp-json/wp-abilities/v1/abilities/modula/read-gallery/run?input[id]=${catalog.galleries.privateAccess.id}`
		);
		expect([401, 403]).toContain(read.status());
		const mcpDenied = await visitor.request.post(
			'/wp-json/mcp/mcp-adapter-default-server',
			{
				headers: { 'X-Modula-E2E-Run': catalog.run },
				data: {
					jsonrpc: '2.0',
					id: 1,
					method: 'initialize',
					params: {},
				},
			}
		);
		expect([401, 403]).toContain(mcpDenied.status());
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
