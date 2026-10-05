/* Real HTTP MCP; shared runner owns the actor, synthetic files and provider objects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { request } = require('@playwright/test');
module.exports = async ({ write, env, mode, password, runDir }) => {
	const fixture = JSON.parse(
		fs.readFileSync(path.join(runDir, mode, 'abilities-css-ai.json'))
	);
	const run = env.MODULA_E2E_RUN;
	const http = await request.newContext({
		baseURL: 'http://localhost:10003',
	});
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
			'MCP-Protocol-Version': '2025-06-18',
			'X-Modula-E2E-Run': run,
			...(session ? { 'Mcp-Session-Id': session } : {}),
		});
		const rpc = async (method, params, allowError = false) => {
			const response = await http.post(
				'/wp-json/mcp/mcp-adapter-default-server',
				{
					headers: headers(),
					data: { jsonrpc: '2.0', id: 1, method, params },
				}
			);
			assert.equal(
				response.status(),
				200,
				`${method} ${params?.arguments?.ability_name || ''}: ${await response.text()}`
			);
			session = response.headers()['mcp-session-id'] || session;
			const body = await response.json();
			if (allowError) {
				return body;
			}
			assert.equal(body.error, undefined, JSON.stringify(body));
			return body.result;
		};
		const call = async (name, parameters) => {
			const result = await rpc('tools/call', {
				name: 'mcp-adapter-execute-ability',
				arguments: { ability_name: `modula/${name}`, parameters },
			});
			let body = result.structuredContent;
			if (!body) {
				try {
					body = JSON.parse(result.content[0].text);
				} catch {
					throw new Error(`${name}: ${result.content[0].text}`);
				}
			}
			assert.notEqual(result.isError, true, JSON.stringify(body));
			assert.notEqual(body.success, false, JSON.stringify(body));
			return body.data;
		};
		await rpc('initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'CSS proposal abilities', version: '1' },
		});

		const target = { id: fixture.gallery.id };
		const read = () => call('read-gallery', target);
		const before = await read();
		const discovery = await call('discover', {});
		assert.ok(
			!JSON.stringify(discovery).includes('modula/generate-gallery-css')
		);
		for (const params of [
			{
				name: 'mcp-adapter-execute-ability',
				arguments: {
					ability_name: 'modula/generate-gallery-css',
					parameters: {
						...target,
						revision: before.gallery.revision,
						request_id: `${run}-${mode}-retired-css`,
						prompt: fixture.prompt,
					},
				},
			},
			{
				name: 'modula-generate-gallery-css',
				arguments: { ...target, prompt: fixture.prompt },
			},
		]) {
			const denied = await rpc('tools/call', params, true);
			assert.ok(
				denied.error || denied.result?.isError,
				JSON.stringify(denied)
			);
		}
		const retained = await call('recover-request', {
			request_id: fixture.proposal_request,
		});
		assert.deepEqual(retained, fixture.proposal);
		assert.deepEqual(
			retained,
			await call('recover-request', {
				request_id: fixture.proposal_request,
			})
		);
		assert.equal(
			(
				await call('recover-request', {
					request_id: fixture.failure_request,
				})
			).status,
			'rejected'
		);
		assert.equal(
			(
				await call('recover-request', {
					request_id: fixture.interrupted_request,
				})
			).status,
			'uncertain'
		);
		assert.deepEqual(
			await read(),
			before,
			'Refused generation and recovery do not mutate gallery'
		);
		const code = fixture.code;
		const changed = await http.patch(
			`/wp-json/modula/v2/gallery/${target.id}/settings`,
			{ headers: headers(), data: { layout: { gutter: 27 } } }
		);
		assert.equal(changed.status(), 200);
		const apply = {
			...target,
			revision: before.gallery.revision,
			request_id: `${run}-${mode}-http-css-apply-stale`,
			settings: { style: { customCss: code } },
		};
		assert.equal((await call('update-gallery', apply)).status, 'conflict');
		apply.revision = (await read()).gallery.revision;
		apply.request_id += '-fresh';
		const applied = await call('update-gallery', apply);
		assert.equal(applied.status, 'succeeded', JSON.stringify(applied));
		assert.deepEqual(applied, await call('update-gallery', apply));
		const anonymous = await request.newContext({
			baseURL: 'http://localhost:10003',
		});
		try {
			const denied = await anonymous.post(
				'/wp-json/mcp/mcp-adapter-default-server',
				{
					headers: { 'X-Modula-E2E-Run': run },
					data: {
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: {
							name: 'mcp-adapter-execute-ability',
							arguments: {
								ability_name: 'modula/recover-request',
								parameters: {
									request_id: fixture.failure_request,
								},
							},
						},
					},
				}
			);
			assert.equal(denied.status(), 401);
		} finally {
			await anonymous.dispose();
		}
		write(`${mode}/abilities-css-ai-http.json`, {
			...fixture,
			code,
			anonymous_denied: true,
			http_live_calls: 0,
			retired_invocation_denied: true,
		});
	} finally {
		await http.dispose();
	}
};
