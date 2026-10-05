/* Real HTTP MCP; shared runner owns the actor, synthetic files and provider objects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { request } = require('@playwright/test');
module.exports = async ({ write, env, mode, password, runDir, wordpress }) => {
	const fixture = JSON.parse(
		fs.readFileSync(
			path.join(runDir, mode, 'abilities-cloud-jobs-native-only.json')
		)
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
			'X-Modula-E2E-Run': run,
			'X-Modula-E2E-Storage': run,
			...(session ? { 'Mcp-Session-Id': session } : {}),
		});
		const rpc = async (method, params) => {
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
			clientInfo: { name: 'Storage and file abilities', version: '1' },
		});

		const output = { passed: true };
		if (mode === 'pro') {
			const interruption = wordpress('abilities-cloud-jobs-interrupt', {
				MODULA_E2E_MODE: mode,
			});
			assert.equal(interruption.terminated_after_first_delete, true);
			const checkpoint = wordpress(
				'abilities-cloud-jobs-interrupted-read',
				{ MODULA_E2E_MODE: mode }
			);
			assert.equal(checkpoint.storage.remote_deleted, 1);
			const interrupted = await call('recover-request', {
				request_id: interruption.request_id,
			});
			assert.equal(interrupted.storage.remote_deleted, 1);
			assert.equal(interrupted.storage.remote_total, 2);
			assert.equal(interrupted.storage.mapping, 'index_retained');
			const remainingRemote = await call('browse-storage', {
				connection_id: fixture.connection_id,
				prefix: run + '/',
				per_page: 100,
			});
			assert.ok(
				!remainingRemote.entries.some(
					(e) => e.key === fixture.crash_item.key
				)
			);
			assert.ok(
				remainingRemote.entries.some(
					(e) => e.key === fixture.crash_item.size_key
				)
			);
			output.interruption = checkpoint;
			const terminal = await call('read-folder-transfer', {
				job_id: fixture.transfer.id,
			});
			assert.equal(terminal.transfer.status, 'done');
			const input = {
				request_id: `${run}-library-http`,
				scope: 'entire_library',
				connection_id: fixture.connection_id,
				revision: (await call('list-storage-connections', { page: 1 }))
					.revision,
			};
			const admitted = await Promise.all([
				call('start-library-offload', input),
				call('start-library-offload', input),
			]);
			assert.ok(
				admitted.some((r) => r.status === 'in_progress'),
				JSON.stringify(admitted)
			);
			const active = await call('recover-request', {
				request_id: input.request_id,
			});
			assert.equal(active.transfer.total, 2);
			assert.deepEqual(
				await call('start-library-offload', input),
				active
			);
			wordpress('abilities-cloud-jobs-process', {
				MODULA_E2E_MODE: mode,
			});
			const finished = await call('recover-request', {
				request_id: input.request_id,
			});
			assert.equal(
				finished.status,
				'succeeded',
				JSON.stringify(finished)
			);
			assert.equal(finished.transfer.processed, 2);
			const [item, remaining] = fixture.http_items;
			for (const mediaItem of fixture.http_items) {
				const response = await http.get(
					`/wp-json/wp/v2/media/${mediaItem.id}?context=edit`,
					{ headers: headers() }
				);
				assert.equal(response.status(), 200);
				const media = await response.json();
				assert.ok(
					!media.source_url.startsWith('http://localhost:10003/')
				);
			}
			const remove = {
				request_id: `${run}-cloud-delete-http`,
				id: item.id,
				key: item.key,
				connection_id: fixture.connection_id,
				revision: (await call('read-attachment', { id: item.id }))
					.attachment.revision,
				storage_revision: (
					await call('list-storage-connections', { page: 1 })
				).revision,
			};
			const removals = await Promise.all([
				call('delete-storage-object', remove),
				call('delete-storage-object', remove),
			]);
			assert.ok(
				removals.some((r) => r.status === 'succeeded'),
				JSON.stringify(removals)
			);
			const removed = await call('recover-request', {
				request_id: remove.request_id,
			});
			assert.equal(removed.status, 'succeeded');
			assert.equal(removed.storage.remote_bytes, 'removed');
			assert.deepEqual(
				await call('delete-storage-object', remove),
				removed
			);
			const deletedMedia = await http.get(
				`/wp-json/wp/v2/media/${item.id}?context=edit`,
				{ headers: headers() }
			);
			assert.equal(deletedMedia.status(), 404);
			const remote = await call('browse-storage', {
				connection_id: fixture.connection_id,
				prefix: run + '/',
				per_page: 100,
			});
			assert.ok(!remote.entries.some((e) => e.key === item.key));
			assert.ok(
				remote.entries.some(
					(e) =>
						e.key === remaining.key &&
						e.attachment_id === remaining.id
				)
			);
			output.transfer = finished.transfer;
			output.deleted = removed;
			output.remaining = remaining;
			output.gallery = fixture.gallery;
			// A second HTTP initialization recovers the same stable result.
			session = undefined;
			await rpc('initialize', {
				protocolVersion: '2025-06-18',
				capabilities: {},
				clientInfo: { name: 'Reconnected cloud jobs', version: '1' },
			});
			assert.deepEqual(
				await call('recover-request', {
					request_id: remove.request_id,
				}),
				removed
			);
			assert.equal(
				(
					await call('recover-request', {
						request_id: input.request_id,
					})
				).status,
				'forbidden'
			);
		} else {
			const discovery = await call('discover', {
				page: 1,
				per_page: 100,
			});
			output.lite_discovery = true;
		}
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
									request_id: `${run}-cloud-delete-http`,
								},
							},
						},
					},
				}
			);
			assert.equal(denied.status(), 401);
			output.anonymous_denied = true;
		} finally {
			await anonymous.dispose();
		}
		write(`${mode}/abilities-cloud-jobs-http.json`, output);
	} finally {
		await http.dispose();
	}
};
