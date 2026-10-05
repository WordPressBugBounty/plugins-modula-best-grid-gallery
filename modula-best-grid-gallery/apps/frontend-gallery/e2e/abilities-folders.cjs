/* HTTP-only MCP matrix; shares the runner's lock, actor, fixtures and cleanup. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { request } = require('@playwright/test');
module.exports = async ({ wordpress, write, env, runDir }) => {
	const run = env.MODULA_E2E_RUN;
	const catalog = JSON.parse(fs.readFileSync(path.join(runDir, 'catalog.json')));
	const attachment = catalog.attachments[0].id;
	const http = await request.newContext({ baseURL: 'http://localhost:10003' });
	try {
		await http.get('/wp-login.php');
		await http.post('/wp-login.php', { form: { log: run, pwd: env.MODULA_E2E_PASSWORD, 'wp-submit': 'Log In', testcookie: '1' } });
		const nonce = (await (await http.get('/wp-admin/admin-ajax.php?action=rest-nonce')).text()).trim();
		assert.match(nonce, /^[a-f0-9]{10}$/);
		for (const mode of ['lite', 'pro']) {
			fs.mkdirSync(path.join(runDir, mode), { recursive: true });
			try {
				write(`${mode}/activation.json`, wordpress('mode', { MODULA_E2E_MODE: mode }));
				wordpress('abilities-transport-prepare');
				let session;
				let profile = 'available';
				async function rpc(method, params) {
					const response = await http.post('/wp-json/mcp/mcp-adapter-default-server', {
						headers: { 'X-WP-Nonce': nonce, 'X-Modula-E2E-Run': run, 'X-Modula-E2E-Folders': profile, ...(session ? { 'Mcp-Session-Id': session } : {}) },
						data: { jsonrpc: '2.0', id: 1, method, params },
					});
					assert.equal(response.status(), 200, await response.text());
					session = response.headers()['mcp-session-id'] || session;
					const body = await response.json();
					assert.equal(body.error, undefined, JSON.stringify(body));
					return body.result;
				}
				function data(result) {
					if (result.structuredContent) return result.structuredContent;
					try { return JSON.parse(result.content[0].text); } catch { return { success: false, message: result.content[0].text }; }
				}
				async function call(name, parameters = { page: 1 }, denied = false) {
					if (Object.keys(parameters).length === 0) parameters = { page: 1 };
					const result = await rpc('tools/call', { name: 'mcp-adapter-execute-ability', arguments: { ability_name: `modula/${name}`, parameters } });
					const body = data(result);
					if (denied) {
						assert.ok(result.isError || body.success === false, JSON.stringify(body));
						return body;
					}
					assert.notEqual(result.isError, true, JSON.stringify(body));
					assert.notEqual(body.success, false, name + ': ' + JSON.stringify(body));
					return body.data;
				}
				await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'Optional Folders regression', version: '1' } });
				const folderInput = { request_id: `${run}-${mode}-retained-folder`, name: `${run}-${mode}-retained`, revision: (await call('list-media-folders')).revision };
				const folder = await call('create-media-folder', folderInput);
				assert.equal(folder.status, 'succeeded');
				const batchInput = { request_id: `${run}-${mode}-retained-batch`, targets: [{ operation: 'modula/add-favorite', id: attachment, revision: (await call('list-favorites')).revision }] };
				const batch = await call('update-media-batch', batchInput);
				assert.equal(batch.status, 'succeeded', JSON.stringify(batch));
				const interrupted = wordpress('abilities-folders', { MODULA_E2E_MODE: mode, MODULA_E2E_FOLDERS_PREPARE: '1' });
				write(`${mode}/interrupted-batch.json`, interrupted);
				for (profile of ['absent', 'uninitialized', 'missing-tables', 'missing-usage', 'available']) {
					write(`${mode}/folders-${profile}-native.json`, wordpress('abilities-folders', { MODULA_E2E_MODE: mode, MODULA_E2E_FOLDERS: profile }));
					const discovery = await call('discover', { per_page: 100 });
					const statuses = Object.fromEntries(discovery.operations.map((op) => [op.name, op.status]));
					const available = ['available', 'missing-usage'].includes(profile);
					assert.equal(statuses['modula/list-media-folders'], available ? 'available' : 'unavailable');
					const adapterCatalog = data(await rpc('tools/call', { name: 'mcp-adapter-discover-abilities', arguments: {} }));
					assert.notEqual(adapterCatalog.success, false);
					const advertised = (adapterCatalog.abilities || adapterCatalog.data?.abilities || []).map((op) => op.name);
					assert.equal(advertised.includes('modula/list-media-folders'), available);
					assert.equal(advertised.includes('modula/list-collections'), available && mode === 'pro');
					assert.equal(advertised.includes('modula/read-attachment-usage'), profile === 'available');
					const input = { request_id: `${run}-${mode}-${profile}-http`, title: `${run}-${mode}-${profile}`, status: 'draft', attachment_ids: [attachment] };
					const created = await call('create-gallery', input);
					assert.equal(created.status, 'succeeded', JSON.stringify(created));
					assert.equal((await call('read-gallery', { id: created.gallery.id })).gallery.id, created.gallery.id);
					assert.deepEqual(await call('create-gallery', input), created);
					await call('list-media-folders', {}, !available);
					if (!available) {
						await call('create-media-folder', folderInput, true);
						await call('update-media-batch', batchInput, true);
						assert.equal((await call('recover-request', { request_id: folderInput.request_id })).status, 'forbidden');
						assert.equal((await call('recover-request', { request_id: batchInput.request_id })).targets[0].status, 'forbidden');
						const pending = await call('recover-request', { request_id: interrupted.input.request_id });
						assert.deepEqual(pending.targets.map((target) => target.status), ['forbidden', 'forbidden']);
						await call('update-media-batch', interrupted.input, true);
					}
					if (profile !== 'available') {
						await call('delete-attachment', { request_id: `${input.request_id}-delete`, id: attachment, revision: '0'.repeat(64) }, true);
					}
					write(`${mode}/folders-${profile}-mcp.json`, { profile, gallery: created.gallery.id, operations: statuses, adapterCatalog, checks: ['authenticated HTTP MCP discovery', 'create/read/replay gallery', 'dependent access', 'retained recovery', 'deletion refusal'] });
				}
				assert.deepEqual(await call('create-media-folder', folderInput), folder);
				assert.deepEqual(await call('update-media-batch', batchInput), batch);
				assert.equal((await call('recover-request', { request_id: folderInput.request_id })).folder.id, folder.folder.id);
				const resumed = await call('update-media-batch', interrupted.input);
				assert.equal(resumed.status, 'partial');
				assert.deepEqual(resumed.targets[0], interrupted.result.targets[0]);
				assert.equal(resumed.targets[1].status, 'conflict');
				assert.deepEqual(await call('update-media-batch', interrupted.input), resumed);
				const trashDisabled = await call('trash-attachment', { request_id: `${run}-${mode}-trash-off`, id: attachment, revision: '0'.repeat(64) });
				assert.equal(trashDisabled.code, 'media_trash_disabled');
				write(`${mode}/resumed-batch.json`, resumed);
				write(`${mode}/restored-replay.json`, { folder: folder.folder.id, batch: batch.status, effectsRepeated: false });
				// Existing native organizer/collection/attachment contracts, no browser scenarios.
				write(`${mode}/abilities-media.json`, wordpress('abilities-media', { MODULA_E2E_MODE: mode }, ['--exec=define("MEDIA_TRASH", true);']));
			} finally {
				write(`${mode}/restoration.json`, wordpress('restore'));
			}
		}
	} finally {
		await http.dispose();
	}
};
