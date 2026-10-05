/* Real HTTP MCP; shared runner owns the actor, synthetic files and provider objects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { request } = require('@playwright/test');
module.exports = async ({ write, env, mode, password, runDir }) => {
	const fixture = JSON.parse(
		fs.readFileSync(path.join(runDir, mode, 'abilities-instagram-ai.json'))
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
			clientInfo: { name: 'Instagram and AI abilities', version: '1' },
		});

		const output = { ...fixture };
		if (fixture.retirement_only) {
			const shapes = {};
			for (const shape of ['image', 'blocks']) {
				const response = await http.post(
					'/wp-json/mcp/mcp-adapter-default-server',
					{
						headers: {
							...headers(),
							'X-Modula-E2E-Visual-Probe': run,
						},
						data: {
							jsonrpc: '2.0',
							id: 1,
							method: 'tools/call',
							params: {
								name: 'modula-e2e-visual-probe',
								arguments: { shape },
							},
						},
					}
				);
				const body = await response.json();
				assert.equal(body.error, undefined, JSON.stringify(body));
				assert.notEqual(
					body.result.isError,
					true,
					JSON.stringify(body)
				);
				shapes[shape] = body.result;
			}
			const image = shapes.image.content.find(
				(item) => item.type === 'image'
			);
			assert.ok(image, JSON.stringify(shapes));
			assert.equal(Buffer.from(image.data, 'base64').readUInt32BE(16), 1);
			assert.equal(image._meta.snapshot, 'owned-snapshot');
			output.visual_transport_probe = {
				image_content_types: shapes.image.content.map(
					(item) => item.type
				),
				image_structured_content: Boolean(
					shapes.image.structuredContent
				),
				blocks_content_types: shapes.blocks.content.map(
					(item) => item.type
				),
				paired_text: shapes.image.content.some(
					(item) => item.type === 'text'
				),
			};
			write(
				`${mode}/visual-transport-probe.json`,
				output.visual_transport_probe
			);
		}

		const target = { id: fixture.attachment_id };
		const original = await call('read-attachment', target);
		const retiredNames = [
			'read-ai-attachment-state',
			'generate-attachment-text',
		];
		const discovery = await call('discover', {});
		const toolsList = await rpc('tools/list', {});
		const adapterDiscovery = await rpc('tools/call', {
			name: 'mcp-adapter-discover-abilities',
			arguments: {},
		});
		for (const name of retiredNames) {
			assert.ok(!JSON.stringify(discovery).includes(`modula/${name}`));
			assert.ok(
				!JSON.stringify(adapterDiscovery).includes(`modula/${name}`)
			);
			assert.ok(!JSON.stringify(toolsList).includes(`modula-${name}`));
			const refused = await rpc('tools/call', {
				name: 'mcp-adapter-execute-ability',
				arguments: {
					ability_name: `modula/${name}`,
					parameters:
						name === 'generate-attachment-text'
							? {
									...target,
									request_id: run + '-' + mode + '-retired',
									revision: original.attachment.revision,
								}
							: target,
				},
			});
			assert.equal(refused.isError, true, JSON.stringify(refused));
			const direct = await http.post(
				'/wp-json/mcp/mcp-adapter-default-server',
				{
					headers: headers(),
					data: {
						jsonrpc: '2.0',
						id: 1,
						method: 'tools/call',
						params: { name: `modula-${name}`, arguments: target },
					},
				}
			);
			const denied = await direct.json();
			assert.ok(
				denied.error || denied.result?.isError,
				JSON.stringify(denied)
			);
		}
		const proposal = await call('recover-request', {
			request_id: fixture.proposal_request,
		});
		assert.equal(proposal.status, 'succeeded');
		assert.equal(
			(
				await call('recover-request', {
					request_id: fixture.proposal_request + '-lost',
				})
			).status,
			'uncertain'
		);
		assert.equal(original.attachment.text.alt, 'Original shared alt');
		const apply = {
			...target,
			revision: original.attachment.revision,
			request_id: run + '-' + mode + '-apply-proposal',
			text: proposal.ai.text,
		};
		const applied = await call('update-attachment-text', apply);
		assert.equal(applied.status, 'succeeded', JSON.stringify(applied));
		assert.deepEqual(applied, await call('update-attachment-text', apply));
		assert.equal(
			(await call('read-attachment', target)).attachment.text.alt,
			'Cached proposed alt'
		);
		const stale = await call('update-attachment-text', {
			...apply,
			request_id: apply.request_id + '-stale',
			text: { alt: 'Must not overwrite' },
		});
		assert.equal(stale.status, 'conflict');
		if (mode === 'pro' && !fixture.retirement_only) {
			if (fixture.live_gallery) {
				const liveState = await call('read-instagram-state', {
					id: fixture.live_gallery.id,
				});
				const liveInput = {
					id: fixture.live_gallery.id,
					revision: liveState.revision,
					request_id: run + '-http-live-instagram',
					max_items: 1,
				};
				if (fixture.live_cursor) {
					liveInput.after = fixture.live_cursor;
				}
				const live = await call('sync-instagram-gallery', liveInput);
				assert.ok(
					['succeeded', 'partial'].includes(live.status),
					JSON.stringify(live)
				);
				assert.ok(
					live.instagram.attachment_ids.length > 0,
					JSON.stringify(live)
				);
				assert.deepEqual(
					live,
					await call('sync-instagram-gallery', liveInput)
				);
				output.live_http = {
					status: live.status,
					retained: live.instagram.attachment_ids.length,
				};
			}
			const instagram = await call('read-instagram-state', {
				id: fixture.galleries[0].id,
			});
			assert.equal(typeof instagram.configured, 'boolean');
			const recovered = await call('recover-request', {
				request_id: fixture.instagram_request,
			});
			assert.equal(recovered.status, 'succeeded');
			assert.deepEqual(recovered.instagram.attachment_ids, [
				fixture.attachment_id,
			]);
			// No configured account means no provider effects on native or HTTP paths.
			if (!instagram.configured) {
				const sync = await call('sync-instagram-gallery', {
					id: fixture.galleries[0].id,
					revision: instagram.revision,
					request_id: run + '-http-unconfigured',
				});
				assert.equal(sync.code, 'instagram_unavailable');
			}
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
								ability_name: 'modula/read-attachment',
								parameters: { id: fixture.attachment_id },
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
		write(`${mode}/abilities-instagram-ai-http.json`, output);
	} finally {
		await http.dispose();
	}
};
