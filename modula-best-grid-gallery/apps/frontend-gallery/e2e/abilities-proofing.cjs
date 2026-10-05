/* Real HTTP MCP; shared runner owns the actor, synthetic files and provider objects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { request } = require('@playwright/test');
module.exports = async ({ write, env, mode, password, runDir }) => {
	const fixture = JSON.parse(
		fs.readFileSync(path.join(runDir, mode, 'abilities-proofing.json'))
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
			if (!fixture.available && result.isError === true) {
				assert.match(
					result.content[0].text,
					/[Pp]ermission denied|[Aa]ccess denied/
				);
				return { denied: true };
			}
			let body = result.structuredContent;
			if (!body) {
				try {
					body = JSON.parse(result.content[0].text);
				} catch {
					throw new Error(`${name}: ${result.content[0].text}`);
				}
			}
			if (!fixture.available) {
				return {
					denied: result.isError === true || body.success === false,
				};
			}
			assert.notEqual(result.isError, true, JSON.stringify(body));
			assert.notEqual(body.success, false, JSON.stringify(body));
			return body.data;
		};
		await rpc('initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Proofing abilities', version: '1' },
		});

		const target = { id: fixture.gallery.id };
		if (!fixture.available) {
			assert.equal((await call('read-proofing', target)).denied, true);
			write(`${mode}/abilities-proofing-http.json`, {
				...fixture,
				http_passed: true,
			});
			return;
		}
		const read = async () => (await call('read-proofing', target)).proofing;
		const initial = await read();
		assert.equal(initial.settings.minSelection, 1);
		const input = {
			...target,
			revision: initial.revision,
			request_id: `${run}-${mode}-http-proof-settings`,
			settings: { maxSelection: 3 },
		};
		const changed = await call('update-proofing', input);
		assert.equal(changed.status, 'succeeded', JSON.stringify(changed));
		assert.deepEqual(changed, await call('update-proofing', input));
		assert.equal(
			(
				await call('update-proofing', {
					...input,
					request_id: input.request_id + '-stale',
				})
			).status,
			'conflict'
		);
		const concurrentRevision = (await read()).revision;
		const racers = await Promise.all(
			[4, 5].map((maxSelection) =>
				call('update-proofing', {
					...target,
					revision: concurrentRevision,
					request_id: `${run}-http-race-${maxSelection}`,
					settings: { maxSelection },
				})
			)
		);
		assert.deepEqual(racers.map((item) => item.status).sort(), [
			'conflict',
			'succeeded',
		]);
		assert.equal(
			(
				await call('update-proofing', {
					...target,
					revision: (await read()).revision,
					request_id: `${run}-http-race-reset`,
					settings: { maxSelection: 3 },
				})
			).status,
			'succeeded'
		);
		const accountInput = {
			request_id: `${run}-${mode}-http-proof-account`,
			username: `${run}-http-client`,
			email: `${run}-http@example.test`,
			send_password_email: false,
		};
		const account = await call('create-proofing-client', accountInput);
		assert.equal(account.status, 'succeeded', JSON.stringify(account));
		assert.equal(account.client.created, true);
		assert.equal(account.client.email_status, 'not_requested');
		assert.deepEqual(
			account,
			await call('create-proofing-client', accountInput)
		);
		const inspected = (
			await call('read-proofing-client', { user_id: account.client.id })
		).client;
		const associated = await call('associate-proofing-client', {
			user_id: inspected.id,
			revision: inspected.revision,
			request_id: `${run}-http-associate`,
		});
		assert.equal(associated.status, 'succeeded');
		const guest = `${run}-http-guest`;
		const inviteInput = {
			...target,
			revision: (await read()).revision,
			request_id: `${run}-http-invite`,
			guest_identifier: guest,
		};
		const invitation = await call(
			'create-proofing-invitation',
			inviteInput
		);
		assert.equal(
			invitation.status,
			'succeeded',
			JSON.stringify(invitation)
		);
		assert.deepEqual(
			invitation,
			await call('create-proofing-invitation', inviteInput)
		);
		const row = invitation.proofing.invitations.find(
			(item) => item.client === guest
		);
		const expire = {
			...target,
			revision: (await read()).revision,
			request_id: `${run}-http-expire`,
			invitation_id: row.id,
			expired: true,
		};
		assert.equal(
			(await call('update-proofing-invitation', expire)).status,
			'succeeded'
		);
		assert.equal(
			(
				await call('delete-proofing-invitation', {
					...target,
					revision: (await read()).revision,
					request_id: `${run}-http-delete`,
					invitation_id: row.id,
				})
			).status,
			'succeeded'
		);
		assert.equal(
			(
				await call('create-proofing-invitation', {
					...inviteInput,
					revision: (await read()).revision,
					request_id: `${run}-http-reinvite`,
				})
			).status,
			'succeeded'
		);
		const mail = require('./proofing-mail.cjs');
		assert.equal(
			(await mail(run)).length,
			2,
			'Two native SMTP messages: accepted and post-send interruption, with no replay'
		);
		const send = {
			...target,
			invitation_id: fixture.invitation_id,
			revision: (await read()).revision,
			recipient: fixture.moderation.recipient,
			request_id: `${run}-http-invitation-email`,
		};
		const sends = await Promise.all([
			call('send-proofing-invitation', send),
			call('send-proofing-invitation', send),
		]);
		assert.ok(sends.some((value) => value.status === 'succeeded'));
		assert.ok(
			sends.every((value) =>
				['succeeded', 'in_progress'].includes(value.status)
			)
		);
		const recovered = await call('recover-request', {
			request_id: send.request_id,
		});
		assert.equal(recovered.proofing_email.email_status, 'accepted');
		assert.deepEqual(
			await call('send-proofing-invitation', send),
			recovered
		);
		const messages = await mail(run);
		assert.equal(
			messages.length,
			3,
			'Concurrent requests produce exactly one additional SMTP message'
		);
		assert.ok(
			messages.every((message) => message.recipient === send.recipient)
		);
		const selectionTarget = {
			...target,
			selection_id: fixture.moderation.selection_id,
		};
		const selected = (
			await call('read-proofing-selection', selectionTarget)
		).selection;
		const unlock = {
			...selectionTarget,
			revision: selected.revision,
			request_id: `${run}-http-unlock`,
		};
		const unlocked = await call('unlock-proofing-selection', unlock);
		assert.equal(unlocked.status, 'succeeded', JSON.stringify(unlocked));
		assert.equal(unlocked.selection.submitted, false);
		assert.deepEqual(
			unlocked.selection.image_ids,
			fixture.moderation.image_ids
		);
		assert.equal(unlocked.selection.notes, fixture.moderation.notes);
		assert.deepEqual(
			await call('unlock-proofing-selection', unlock),
			unlocked
		);
		const selections = await call('list-proofing-selections', target);
		const other = selections.selections.find(
			(selection) => selection.id !== selected.id
		);
		assert.ok(other);
		const deletion = {
			...target,
			selection_id: other.id,
			revision: other.revision,
			request_id: `${run}-http-delete-selection`,
		};
		const deleted = await call('delete-proofing-selection', deletion);
		assert.equal(deleted.status, 'succeeded');
		assert.deepEqual(
			await call('delete-proofing-selection', deletion),
			deleted
		);
		assert.equal(
			(await call('list-proofing-selections', target)).selections.length,
			1
		);
		write(`${mode}/proofing-moderation-http.json`, {
			messages: messages.length,
			selected: unlocked.selection,
			deleted: other.id,
		});
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
								ability_name: 'modula/read-proofing',
								parameters: target,
							},
						},
					},
				}
			);
			assert.equal(denied.status(), 401);
		} finally {
			await anonymous.dispose();
		}
		write(`${mode}/abilities-proofing-http.json`, {
			...fixture,
			http_passed: true,
			guest_url: `${fixture.page}?mip_name=${guest}`,
		});
	} finally {
		await http.dispose();
	}
};
