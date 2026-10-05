/* Real HTTP MCP; shared runner owns the actor, synthetic files and provider objects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { request } = require('@playwright/test');
module.exports = async ({ write, env, mode, password, runDir }) => {
	const fixture = JSON.parse(
		fs.readFileSync(
			path.join(runDir, mode, 'abilities-watermark-video.json')
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

		const output = { ...fixture };
		if (mode === 'pro') {
			const id = fixture.galleries[0].id;
			const target = { id, attachment_id: fixture.attachment_id };
			const recovered = await call('recover-request', {
				request_id: fixture.watermark_request,
			});
			assert.equal(recovered.status, 'succeeded');
			const before = await call('read-watermark-state', target);
			const remove = {
				...target,
				request_id: run + '-http-watermark-remove',
				revision: before.watermark.revision,
			};
			const restored = await call('remove-watermark', remove);
			assert.equal(
				restored.status,
				'succeeded',
				JSON.stringify(restored)
			);
			assert.equal(
				restored.watermark.original_sha256,
				fixture.original_sha256
			);
			assert.deepEqual(restored, await call('remove-watermark', remove));
			const state = await call('read-watermark-state', target);
			const apply = {
				...target,
				request_id: run + '-http-watermark-apply',
				revision: state.watermark.revision,
			};
			const applied = await call('apply-watermark', apply);
			assert.equal(applied.status, 'succeeded', JSON.stringify(applied));
			assert.deepEqual(applied, await call('apply-watermark', apply));
			output.watermark = applied.watermark;
			const gallery = await call('read-gallery', { id });
			const patch = {
				id,
				request_id: run + '-http-video-add',
				revision: gallery.gallery.revision,
				video_changes: [
					{
						action: 'add',
						item_id: 'video_template_9100',
						attachment_id: fixture.video_id,
						fields: {
							video_title: 'MCP local video',
							autoplay_lightbox: 'off',
							loop_video: 'on',
						},
					},
					{
						action: 'move',
						item_id: 'video_template_9100',
						before_id: 'video_template_9001',
					},
				],
			};
			const saved = await call('update-gallery-videos', patch);
			assert.equal(saved.status, 'succeeded', JSON.stringify(saved));
			assert.deepEqual(saved, await call('update-gallery-videos', patch));
			const read = await call('read-gallery', { id });
			assert.deepEqual(
				read.items.map((row) => row.id),
				[
					fixture.attachment_id,
					'video_template_9100',
					'video_template_9001',
				]
			);
			assert.equal(
				(
					await call('update-gallery-videos', {
						...patch,
						request_id: run + '-http-video-stale',
					})
				).status,
				'conflict'
			);
			// Existing public YouTube snapshot flow; without a configured account it uses the provider poster URL fallback.
			const source = {
				id,
				request_id: run + '-http-video-source',
				revision: read.gallery.revision,
				kind: 'video',
				url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
			};
			const resolved = await call('resolve-video-source', source);
			assert.equal(
				resolved.status,
				'succeeded',
				JSON.stringify(resolved)
			);
			assert.deepEqual(
				resolved,
				await call('resolve-video-source', source)
			);
			const attach = {
				id,
				request_id: run + '-http-provider-add',
				revision: read.gallery.revision,
				video_changes: [
					{
						action: 'add',
						item_id: 'video_template_9200',
						source_request_id: source.request_id,
						source_index: 0,
					},
				],
			};
			const attached = await call('update-gallery-videos', attach);
			assert.equal(
				attached.status,
				'succeeded',
				JSON.stringify(attached)
			);
			// Keep the browser playback deterministic and local; provider row persistence is checked through the same read API.
			const withProvider = await call('read-gallery', { id });
			assert.ok(
				withProvider.items.some(
					(row) =>
						row.id === 'video_template_9200' &&
						row.video_url === source.url
				)
			);
			assert.equal(
				(
					await call('update-gallery-videos', {
						id,
						request_id: run + '-http-provider-remove',
						revision: withProvider.gallery.revision,
						video_changes: [
							{
								action: 'remove',
								item_id: 'video_template_9200',
							},
						],
					})
				).status,
				'succeeded'
			);
			output.provider_snapshot =
				'existing YouTube flow; metadata API only when account is configured';
			const current = await call('read-gallery', { id });
			const playlistInput = {
				id,
				request_id: run + '-http-playlist',
				max_sources: 2,
				revision: current.gallery.revision,
				kind: 'playlist',
				url: 'https://www.youtube.com/playlist?list=PL6B3937A5D230E335',
			};
			const playlist = await call('resolve-video-source', playlistInput);
			assert.equal(playlist.status, 'partial');
			assert.equal(playlist.video.complete, false);
			assert.equal(playlist.video.sources.length, 2);
			assert.deepEqual(
				playlist,
				await call('resolve-video-source', playlistInput)
			);
			output.playlist = {
				status: playlist.status,
				code: playlist.code,
				sources: playlist.video?.sources.length || 0,
				url: playlistInput.url,
			};
			if (
				['succeeded', 'partial'].includes(playlist.status) &&
				playlist.video.sources.length
			) {
				const addedPlaylist = await call('update-gallery-videos', {
					id,
					request_id: run + '-http-playlist-add',
					revision: current.gallery.revision,
					video_changes: playlist.video.sources
						.slice(0, 2)
						.map((_source, index) => ({
							action: 'add',
							item_id: 'video_template_' + (9300 + index),
							source_request_id: playlistInput.request_id,
							source_index: index,
						})),
				});
				assert.equal(
					addedPlaylist.status,
					'succeeded',
					JSON.stringify(addedPlaylist)
				);
				const playlistGallery = await call('read-gallery', { id });
				const selected = playlistGallery.items.filter((row) =>
					/^video_template_930[01]$/.test(row.id)
				);
				assert.equal(
					selected.length,
					Math.min(2, playlist.video.sources.length)
				);
				output.playlist.items = selected.map((row) => ({
					id: row.id,
					video_url: row.video_url,
				}));
			}
		} else {
			const discovery = await call('discover', { per_page: 100 });
			for (const name of [
				'apply-watermark',
				'remove-watermark',
				'resolve-video-source',
				'update-gallery-videos',
			]) {
				assert.equal(
					discovery.operations.find(
						(entry) => entry.name === 'modula/' + name
					).status,
					'unavailable'
				);
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
								ability_name: 'modula/read-watermark-state',
								parameters: { id: 1, attachment_id: 1 },
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
		write(`${mode}/abilities-watermark-video-http.json`, output);
	} finally {
		await http.dispose();
	}
};
