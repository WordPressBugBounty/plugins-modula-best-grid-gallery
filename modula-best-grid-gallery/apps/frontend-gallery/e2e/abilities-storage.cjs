/* Real HTTP MCP; shared runner owns the actor, synthetic files and provider objects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { request } = require('@playwright/test');
module.exports = async ({ write, env, mode, password, runDir }) => {
	const fixture = JSON.parse(
		fs.readFileSync(path.join(runDir, mode, 'abilities-storage.json'))
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
		const read = await call('read-attachment-file', { id: fixture.id });
		const input = {
			id: fixture.id,
			revision: read.file.revision,
			request_id: `${run}-${mode}-file-http`,
			filename: 'replacement.jpg',
			content_base64: fixture.content_base64,
		};
		const concurrent = await Promise.all([
			call('replace-attachment-file', input),
			call('replace-attachment-file', input),
		]);
		assert.ok(
			concurrent.some((r) => r.status === 'succeeded'),
			JSON.stringify(concurrent)
		);
		const saved = await call('recover-request', {
			request_id: input.request_id,
		});
		assert.equal(saved.status, 'succeeded');
		assert.deepEqual(await call('replace-attachment-file', input), saved);
		const hash = crypto
			.createHash('sha256')
			.update(Buffer.from(fixture.content_base64, 'base64'))
			.digest('hex');
		const bytes = await http.get(fixture.url + '?e2e=' + run);
		assert.equal(
			crypto
				.createHash('sha256')
				.update(await bytes.body())
				.digest('hex'),
			hash
		);
		const media = await http.get(
			`/wp-json/wp/v2/media/${fixture.id}?context=edit`,
			{ headers: headers() }
		);
		assert.equal(media.status(), 200);
		assert.equal((await media.json()).title.raw, 'Preserved shared title');
		const output = {
			replacement: saved,
			sha256: hash,
			id: fixture.id,
			galleries: fixture.galleries,
			page: fixture.page,
		};
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
								parameters: { request_id: input.request_id },
							},
						},
					},
				}
			);
			assert.equal(denied.status(), 401);
			output.anonymous_recovery_denied = true;
		} finally {
			await anonymous.dispose();
		}
		if (mode === 'pro') {
			const browse = await call('browse-storage', {
				connection_id: fixture.connection_id,
				prefix: fixture.remote_prefix,
				per_page: 1,
			});
			assert.equal(browse.entries.length, 1);
			assert.ok(browse.next_cursor);
			const ingest = {
				request_id: `${run}-${mode}-ingest-http`,
				connection_id: fixture.connection_id,
				key: fixture.remote_key,
				revision: browse.revision,
			};
			const results = await Promise.all([
				call('ingest-storage-object', ingest),
				call('ingest-storage-object', ingest),
			]);
			assert.ok(
				results.some((r) => r.status === 'succeeded'),
				JSON.stringify(results)
			);
			const ingested = await call('recover-request', {
				request_id: ingest.request_id,
			});
			assert.equal(ingested.status, 'succeeded');
			assert.deepEqual(
				await call('ingest-storage-object', ingest),
				ingested
			);
			const id = ingested.storage.attachment_id;
			const library = await http.get(
				`/wp-json/wp/v2/media/${id}?context=edit`,
				{ headers: headers() }
			);
			assert.equal(library.status(), 200);
			assert.equal((await library.json()).id, id);
			const remove = {
				request_id: `${run}-${mode}-uningest-http`,
				id,
				revision: (await call('read-attachment', { id })).attachment
					.revision,
				storage_revision: (
					await call('list-storage-connections', { page: 1 })
				).revision,
			};
			const removed = await call('uningest-storage-object', remove);
			assert.equal(removed.status, 'succeeded');
			assert.deepEqual(
				await call('uningest-storage-object', remove),
				removed
			);
			const after = await call('browse-storage', {
				connection_id: fixture.connection_id,
				prefix: fixture.remote_prefix,
				per_page: 100,
			});
			assert.ok(
				after.entries.some(
					(r) => r.key === fixture.remote_key && r.attachment_id === 0
				)
			);
			output.storage = { ingested, removed, remote_preserved: true };
		}
		if (fixture.cloud_image) {
			const id = fixture.cloud_image.id;
			const context = await call('read-attachment-image-context', { id });
			const visual = {
				id,
				revision: context.revision,
				visual_revision: context.visual_revision,
			};
			const pixels = await rpc('tools/call', {
				name: 'modula-read-attachment-image',
				arguments: visual,
			});
			assert.notEqual(pixels.isError, true);
			assert.equal(pixels.content[0].type, 'image');
			assert.ok(
				Buffer.from(pixels.content[0].data, 'base64').length > 100
			);
			const writeInput = {
				...visual,
				request_id: `${run}-cloud-visual-http`,
				text: { alt: 'Private cloud MCP alt' },
			};
			const savedText = await call('update-attachment-text', writeInput);
			assert.equal(savedText.status, 'succeeded');
			assert.deepEqual(
				await call('recover-request', {
					request_id: writeInput.request_id,
				}),
				savedText
			);
			const cloudMedia = await http.get(
				`/wp-json/wp/v2/media/${id}?context=edit`,
				{ headers: headers() }
			);
			const row = await cloudMedia.json();
			assert.equal(row.alt_text, 'Private cloud MCP alt');
			assert.equal(row.title.raw, 'Private shared image');
			output.cloud_image = fixture.cloud_image;
		}
		if (fixture.bound) {
			const source = await call('read-bind-target', {
				target: fixture.bound.target,
			});
			const create = {
				request_id: `${run}-${mode}-bound-http`,
				revision: source.revision,
				target: fixture.bound.target,
				title: 'Bound HTTP gallery',
				status: 'publish',
			};
			const created = await call('create-bound-gallery', create);
			assert.equal(created.status, 'succeeded', JSON.stringify(created));
			assert.deepEqual(
				await call('create-bound-gallery', create),
				created
			);
			const id = created.gallery.id;
			const boundRead = await call('read-bound-gallery', { id });
			assert.deepEqual(
				boundRead.items.map((item) => item.id),
				fixture.bound.attachment_ids
			);
			const hide = {
				request_id: `${run}-${mode}-bound-hide-http`,
				id,
				revision: boundRead.revision,
				action: 'hide',
				attachment_ids: [fixture.bound.attachment_ids[0]],
			};
			const hidden = await call('update-bound-exclusions', hide);
			assert.equal(hidden.status, 'succeeded');
			assert.deepEqual(
				await call('update-bound-exclusions', hide),
				hidden
			);
			const afterHide = await call('read-bound-gallery', { id });
			assert.equal(afterHide.items.length, 1);
			const restored = await call('update-bound-exclusions', {
				...hide,
				request_id: `${run}-${mode}-bound-restore-http`,
				revision: afterHide.revision,
				action: 'restore',
			});
			assert.equal(restored.status, 'succeeded');
			const pageUpdate = await http.post(
				`/wp-json/wp/v2/pages/${fixture.bound.page_id}`,
				{ headers: headers(), data: { content: `[modula id="${id}"]` } }
			);
			assert.equal(pageUpdate.status(), 200);
			const terminal = await call('read-folder-transfer', {
				job_id: fixture.transfer.id,
			});
			assert.equal(terminal.transfer.status, 'done');
			assert.equal(terminal.transfer.processed, 2);
			const folder = await call('create-media-folder', {
				request_id: `${run}-${mode}-empty-transfer-folder`,
				revision: (await call('list-media-folders', { page: 1 }))
					.revision,
				name: `${run}-http-empty`,
			});
			assert.equal(folder.status, 'succeeded', JSON.stringify(folder));
			const start = {
				request_id: `${run}-${mode}-empty-transfer`,
				folder_id: folder.folder.id,
				revision: (await call('list-storage-connections', { page: 1 }))
					.revision,
				direction: 'offload',
				connection_id: fixture.connection_id,
			};
			const job = await call('start-folder-transfer', start);
			assert.equal(job.status, 'succeeded', JSON.stringify(job));
			assert.equal(job.transfer.total, 0);
			assert.deepEqual(await call('start-folder-transfer', start), job);
			const cancelled = await call('cancel-folder-transfer', {
				request_id: `${run}-${mode}-terminal-cancel`,
				job_id: job.transfer.id,
			});
			assert.equal(cancelled.transfer.status, 'done');
			output.bound = {
				...fixture.bound,
				id,
				editor_url: created.gallery.editor_url,
			};
			output.transfer = terminal.transfer;
		}

		write(`${mode}/abilities-storage-http.json`, output);
	} finally {
		await http.dispose();
	}
};
