/* Authenticated HTTP MCP only; native runner owns fixtures, lock and cleanup. */
const assert = require('node:assert/strict');
const { request } = require('@playwright/test');
module.exports = async ({ wordpress, write, env, mode, password }) => {
	const run = env.MODULA_E2E_RUN;
	const fixture = wordpress('abilities-operations-http-prepare', {
		MODULA_E2E_MODE: mode,
	});
	const http = await request.newContext({
		baseURL: 'http://localhost:10003',
	});
	let profile = 'server';
	let session;
	try {
		await http.get('/wp-login.php');
		await http.post('/wp-login.php', {
			form: {
				log: run,
				pwd: password,
				'wp-submit': 'Log In',
				testcookie: '1',
			},
		});
		const nonce = (
			await (
				await http.get('/wp-admin/admin-ajax.php?action=rest-nonce')
			).text()
		).trim();
		assert.match(nonce, /^[a-f0-9]{10}$/);
		const headers = () => ({
			'X-WP-Nonce': nonce,
			'X-Modula-E2E-Run': run,
			'X-Modula-E2E-Operations': profile,
			...(session ? { 'Mcp-Session-Id': session } : {}),
		});
		async function rpc(method, params) {
			const response = await http.post(
				'/wp-json/mcp/mcp-adapter-default-server',
				{
					headers: headers(),
					data: { jsonrpc: '2.0', id: 1, method, params },
				}
			);
			assert.equal(response.status(), 200, await response.text());
			session = response.headers()['mcp-session-id'] || session;
			const body = await response.json();
			assert.equal(body.error, undefined, JSON.stringify(body));
			return body.result;
		}
		async function call(name, parameters) {
			const result = await rpc('tools/call', {
				name: 'mcp-adapter-execute-ability',
				arguments: { ability_name: `modula/${name}`, parameters },
			});
			const body =
				result.structuredContent || JSON.parse(result.content[0].text);
			assert.notEqual(result.isError, true, JSON.stringify(body));
			assert.notEqual(body.success, false, JSON.stringify(body));
			return body.data;
		}
		await rpc('initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: {
				name: 'Server intake and Diagnostics regression',
				version: '1',
			},
		});
		async function browseAll() {
			const first = await call('browse-server-folder', { per_page: 100 });
			for (let page = 2; (page - 1) * 100 < first.total; page++) {
				first.entries.push(
					...(
						await call('browse-server-folder', {
							per_page: 100,
							page,
							root: first.root,
						})
					).entries
				);
			}
			return first;
		}
		const browse = await browseAll();
		write(`${mode}/operations-browse.json`, browse);
		assert.ok(browse.entries.some((entry) => entry.path === fixture.path));
		const input = {
			request_id: `${run}-${mode}-server-http`,
			root: browse.root,
			paths: [fixture.path],
			delete_after_import: true,
		};
		const concurrent = await Promise.all([
			call('import-server-files', input),
			call('import-server-files', input),
		]);
		assert.ok(
			concurrent.some((result) => result.status === 'succeeded'),
			JSON.stringify(concurrent)
		);
		const imported = await call('recover-request', {
			request_id: input.request_id,
		});
		assert.equal(imported.status, 'succeeded');
		assert.equal(imported.intake.objects[0].source_status, 'deleted');
		assert.deepEqual(await call('import-server-files', input), imported);
		assert.ok(
			!(
				await call('browse-server-folder', { per_page: 100 })
			).entries.some((entry) => entry.path === fixture.path)
		);
		const media = await http.get(
			`/wp-json/wp/v2/media/${imported.intake.attachment_ids[0]}?context=edit`,
			{ headers: headers() }
		);
		assert.equal(media.status(), 200);
		assert.equal((await media.json()).media_type, 'image');
		const bad = await call('import-server-files', {
			...input,
			request_id: `${input.request_id}-bad`,
			paths: ['../outside.jpg'],
		});
		assert.equal(bad.status, 'rejected');
		profile = 'diagnostics';
		const status = await call('read-diagnostics', { scope: 'status' });
		const enable = {
			request_id: `${run}-${mode}-debug-http-enable`,
			revision: status.revision,
		};
		const enabled = await call('enable-debug-log', enable);
		assert.equal(enabled.status, 'succeeded');
		assert.deepEqual(await call('enable-debug-log', enable), enabled);
		const admin = wordpress('abilities-operations-http-inspect', {
			MODULA_E2E_MODE: mode,
		});
		assert.equal(admin.status.active, true);
		const log = await call('read-debug-log', { per_page: 10 });
		assert.equal(log.total, 1);
		assert.ok(!JSON.stringify(log).includes('HTTP-secret'));
		assert.equal(log.entries[0].redacted, true);
		const stale = await call('clear-debug-log', {
			request_id: `${run}-${mode}-debug-http-stale`,
			revision: enabled.diagnostics.revision,
		});
		assert.equal(stale.status, 'conflict');
		// Ordinary authenticated Diagnostics administration agrees with the ability state.
		const adminDisable = await http.post(
			'/wp-json/modula-best-grid-gallery/v1/debug-log',
			{ headers: headers(), data: { action: 'disable' } }
		);
		assert.equal(adminDisable.status(), 200, await adminDisable.text());
		assert.equal((await adminDisable.json()).status.active, false);
		const disabled = await call('read-diagnostics', { scope: 'status' });
		assert.equal(disabled.active, false);
		assert.equal(disabled.has_file, true);
		const clear = {
			request_id: `${run}-${mode}-debug-http-clear`,
			revision: disabled.revision,
		};
		const cleared = await call('clear-debug-log', clear);
		assert.equal(cleared.status, 'succeeded');
		assert.equal(cleared.diagnostics.has_file, false);
		assert.deepEqual(
			await call('recover-request', { request_id: clear.request_id }),
			cleared
		);
		const raw = await http.get(
			'/wp-json/modula-best-grid-gallery/v1/debug-log/download',
			{ headers: headers() }
		);
		assert.equal(raw.status(), 404);
		const anon = await request.newContext({
			baseURL: 'http://localhost:10003',
		});
		try {
			const response = await anon.post(
				'/wp-json/mcp/mcp-adapter-default-server',
				{
					headers: { 'X-Modula-E2E-Run': run },
					data: {
						jsonrpc: '2.0',
						id: 1,
						method: 'initialize',
						params: {},
					},
				}
			);
			assert.ok([401, 403].includes(response.status()));
		} finally {
			await anon.dispose();
		}
		write(`${mode}/abilities-operations-mcp.json`, {
			imported,
			enabled,
			cleared,
			checks: [
				'native Media Library readback',
				'concurrent duplicate admission',
				'explicit source removal',
				'replay and recovery',
				'invalid path',
				'redacted pagination',
				'ordinary Diagnostics REST state',
				'anonymous refusal',
			],
		});
	} finally {
		await http.dispose();
	}
};
