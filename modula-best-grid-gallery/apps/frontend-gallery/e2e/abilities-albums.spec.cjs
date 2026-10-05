const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const fs = require('fs');
const path = require('path');
const dir = process.env.MODULA_E2E_RUN_DIR;
const mode = process.env.MODULA_E2E_MODE;
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'catalog.json')));
const nativeOnly = JSON.parse(
	fs.readFileSync(path.join(dir, mode, 'abilities-albums-native-only.json'))
);
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
test('Album MCP mutations preserve editor settings, members and anonymous protection', async ({
	page,
	evidence,
}, testInfo) => {
	expect(nativeOnly.adapter_loaded).toBe(false);
	await page.goto(catalog.galleries.visible.editor);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Albums E2E', version: '1' },
		})
	).session;
	if (mode === 'lite') {
		const unavailable = await call(
			page,
			'modula/create-album',
			{
				request_id: process.env.MODULA_E2E_RUN + '-lite-mcp-album',
				title: 'Unavailable',
				status: 'draft',
			},
			session
		);
		expect(unavailable.status).toBe('forbidden');
		expect(unavailable.album).toBeUndefined();
		return;
	}
	const id = catalog.albums.abilityAlbum.id;
	const api = (route, method = 'GET', data) =>
		page.evaluate(
			async ({ route: apiRoute, method: apiMethod, data: apiData }) =>
				window.wp.apiFetch({
					path: apiRoute,
					method: apiMethod,
					data: apiData,
				}),
			{ route, method, data }
		);
	const members = await api(`/modula/v2/album/${id}/members`);
	const sharedSettings = await api(
		`/modula/v2/album/${catalog.albums.betaMerge.id}/settings`
	);
	expect(sharedSettings.general.mergeItems).toBe(true);
	const read = await call(page, 'modula/read-album', { id }, session);
	const input = {
		request_id: process.env.MODULA_E2E_RUN + '-album-mcp-update',
		id,
		revision: read.album.revision,
		metadata: { title: 'MCP configured album' },
		settings: {
			layout: { gutter: 37 },
			general: { mergeItems: false, albumType: 'custom-grid' },
		},
	};
	const out = await call(page, 'modula/update-album', input, session);
	expect(out.status).toBe('succeeded');
	expect(
		await call(
			page,
			'modula/recover-request',
			{ request_id: input.request_id },
			session
		)
	).toEqual(out);
	expect(await call(page, 'modula/update-album', input, session)).toEqual(
		out
	);
	await page.goto(out.album.editor_url);
	await expect(page.locator('#modula-album-takeover-root')).toBeVisible();
	const saved = await api(`/modula/v2/album/${id}/settings`);
	expect(saved.layout.gutter).toBe(37);
	expect(saved.general.mergeItems).toBe(false);
	expect(saved.general.albumType).toBe('custom-grid');
	expect(await api(`/modula/v2/album/${id}/members`)).toEqual(members);
	const current = await native(page, 'modula/read-album', { id });
	await api(`/modula/v2/album/${id}/settings`, 'PATCH', {
		layout: { gutter: 39 },
	});
	const conflict = await call(
		page,
		'modula/update-album',
		{
			...input,
			request_id: input.request_id + '-stale',
			revision: current.album.revision,
		},
		session
	);
	expect(conflict.status).toBe('conflict');
	await page.reload();
	expect((await api(`/modula/v2/album/${id}/settings`)).layout.gutter).toBe(
		39
	);
	const created = await call(
		page,
		'modula/create-album',
		{
			request_id: process.env.MODULA_E2E_RUN + '-album-mcp-create',
			title: 'MCP draft album',
			status: 'draft',
		},
		session
	);
	expect(created.status).toBe('succeeded');
	expect(created.album.status).toBe('draft');
	const listed = await call(
		page,
		'modula/list-albums',
		{ page: 1, per_page: 100, search: 'MCP draft album' },
		session
	);
	expect(listed.albums.some((row) => row.id === created.album.id)).toBe(true);
	const failedConfirmation = await call(
		page,
		'modula/update-album',
		{
			request_id: process.env.MODULA_E2E_RUN + '-pro-album-http-output',
			id: created.album.id,
			revision: created.album.revision,
			metadata: { title: 'Album saved before lost confirmation' },
		},
		session
	);
	expect(failedConfirmation.status).toBe('uncertain');
	expect(failedConfirmation.code).toBe('output_validation_failed');
	expect(
		(
			await call(
				page,
				'modula/read-album',
				{ id: created.album.id },
				session
			)
		).album.title
	).toBe('Album saved before lost confirmation');
	expect(
		await call(
			page,
			'modula/recover-request',
			{
				request_id:
					process.env.MODULA_E2E_RUN + '-pro-album-http-output',
			},
			session
		)
	).toEqual(failedConfirmation);
	const raceRead = await call(
		page,
		'modula/read-album',
		{ id: created.album.id },
		session
	);
	const race = await Promise.all(
		[40, 41].map((gutter) =>
			call(
				page,
				'modula/update-album',
				{
					request_id:
						process.env.MODULA_E2E_RUN + '-album-race-' + gutter,
					id: created.album.id,
					revision: raceRead.album.revision,
					settings: { layout: { gutter } },
				},
				session
			)
		)
	);
	expect(race.map((row) => row.status).sort()).toEqual([
		'conflict',
		'succeeded',
	]);
	// The member order and spans must reach both the existing editor and visitor.
	const composition = await call(
		page,
		'modula/read-album-members',
		{ id },
		session
	);
	const memberRows = [...composition.members].reverse().map((row, index) => ({
		id: row.id,
		itemType: row.itemType || 'modula-gallery',
		width: index ? 1 : 3,
		height: 2,
		gridX: index ? 3 : 0,
		gridY: 0,
	}));
	const memberInput = {
		request_id: process.env.MODULA_E2E_RUN + '-mcp-members',
		id,
		revision: composition.revision,
		members: memberRows,
	};
	const memberOut = await call(
		page,
		'modula/update-album-members',
		memberInput,
		session
	);
	expect(memberOut.status).toBe('succeeded');
	expect(
		await call(page, 'modula/update-album-members', memberInput, session)
	).toEqual(memberOut);
	expect(
		await call(
			page,
			'modula/recover-request',
			{ request_id: memberInput.request_id },
			session
		)
	).toEqual(memberOut);
	await page.reload();
	await expect(page.locator('#modula-album-takeover-root')).toBeVisible();
	const editorMembers = await api(`/modula/v2/album/${id}/members`);
	expect(editorMembers.members.map((row) => row.id)).toEqual(
		memberRows.map((row) => row.id)
	);
	expect(editorMembers.members[0].width).toBe(3);
	expect((await api(`/modula/v2/album/${id}/settings`)).layout.gutter).toBe(
		39
	);
	const candidateList = await call(
		page,
		'modula/list-album-member-candidates',
		{ id, page: 1, per_page: 100 },
		session
	);
	expect(candidateList.candidates.some((row) => row.id === id)).toBe(false);
	expect(
		candidateList.candidates.some((row) =>
			memberRows.some((member) => member.id === row.id)
		)
	).toBe(false);
	await page.goto(catalog.galleries.visible.editor);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const staleComposition = await call(
		page,
		'modula/read-album-members',
		{ id },
		session
	);
	await api(`/modula/v2/album/${id}/members`, 'PUT', editorMembers);
	// Real editor layout write changes the graph revision.
	const editedMembers = {
		members: editorMembers.members.map((row, index) => ({
			...row,
			width: index ? row.width : 4,
		})),
	};
	await api(`/modula/v2/album/${id}/members`, 'PUT', editedMembers);
	expect(
		(
			await call(
				page,
				'modula/update-album-members',
				{
					...memberInput,
					request_id: memberInput.request_id + '-stale',
					revision: staleComposition.revision,
				},
				session
			)
		).status
	).toBe('conflict');
	const freshMembers = await call(
		page,
		'modula/read-album-members',
		{ id },
		session
	);
	const memberRace = await Promise.all(
		[2, 3].map((width) =>
			call(
				page,
				'modula/update-album-members',
				{
					...memberInput,
					request_id: memberInput.request_id + '-race-' + width,
					revision: freshMembers.revision,
					members: memberRows.map((row, index) => ({
						...row,
						width: index ? row.width : width,
					})),
				},
				session
			)
		)
	);
	expect(memberRace.map((row) => row.status).sort()).toEqual([
		'conflict',
		'succeeded',
	]);
	const savedMemberRows = (await api(`/modula/v2/album/${id}/members`))
		.members;

	const presetInput = {
		request_id: process.env.MODULA_E2E_RUN + '-mcp-album-preset',
		title: 'MCP album preset',
		status: 'publish',
		settings: { layout: { gutter: 26 } },
		sorting: 'manual',
	};
	const albumPreset = await call(
		page,
		'modula/create-album-preset',
		presetInput,
		session
	);
	expect(albumPreset.status).toBe('succeeded');
	expect(
		await call(page, 'modula/create-album-preset', presetInput, session)
	).toEqual(albumPreset);
	const presetId = albumPreset.preset.id;
	const presetRead = await call(
		page,
		'modula/read-album-preset',
		{ id: presetId },
		session
	);
	expect(presetRead.preset.settings.layout.gutter).toBe(26);
	const presetChanged = await call(
		page,
		'modula/update-album-preset',
		{
			request_id: presetInput.request_id + '-update',
			id: presetId,
			revision: presetRead.preset.revision,
			settings: { layout: { gutter: 32 } },
		},
		session
	);
	expect(presetChanged.status).toBe('succeeded');
	expect(
		(await api('/modula-defaults/v1/album-presets')).presets.some(
			(row) => row.id === presetId
		)
	).toBe(true);
	const listedPresets = await call(
		page,
		'modula/list-album-presets',
		{ page: 1, per_page: 100 },
		session
	);
	const lastPresetPage =
		listedPresets.total_pages > 1
			? await call(
					page,
					'modula/list-album-presets',
					{ page: listedPresets.total_pages, per_page: 100 },
					session
				)
			: listedPresets;
	expect(lastPresetPage.presets.some((row) => row.id === presetId)).toBe(
		true
	);

	expect((await api(`/modula/v2/album/${id}/settings`)).layout.gutter).toBe(
		39
	);
	expect((await api(`/modula/v2/album/${id}/members`)).members).toEqual(
		savedMemberRows
	);
	const deletionInput = {
		request_id: presetInput.request_id + '-delete',
		id: presetId,
		revision: presetChanged.preset.revision,
	};
	const presetDeleted = await call(
		page,
		'modula/delete-album-preset',
		deletionInput,
		session
	);
	expect(presetDeleted.status).toBe('succeeded');
	expect(
		await call(
			page,
			'modula/recover-request',
			{ request_id: deletionInput.request_id },
			session
		)
	).toEqual(presetDeleted);
	expect(
		await call(page, 'modula/delete-album-preset', deletionInput, session)
	).toEqual(presetDeleted);

	const visitor = await evidence.anonymous();
	try {
		expect(
			await api(
				`/modula/v2/album/${catalog.albums.betaMerge.id}/settings`
			)
		).toEqual(sharedSettings);
		const publicPage = await visitor.newPage();
		await publicPage.goto(catalog.pages.abilityAlbum);
		await expect(publicPage.locator(`#jtg-album-${id}`)).toBeVisible();
		expect(
			JSON.parse(
				await publicPage
					.locator(`#jtg-album-${id}`)
					.getAttribute('data-config')
			).gutter
		).toBe(39);
		const publicMembers = publicPage.locator(
			`#jtg-album-${id} .modula-item a[data-gallery-id]`
		);
		expect(
			await publicMembers.evaluateAll((nodes) =>
				nodes.map((node) => Number(node.dataset.galleryId))
			)
		).toEqual(savedMemberRows.map((row) => row.id));
		await expect(
			publicPage.locator(`#jtg-album-${id} .modula-item`).first()
		).toHaveAttribute('data-width', String(savedMemberRows[0].width));
		await evidence.capture(publicPage, 'abilities-album-public');
		await publicPage.goto(catalog.pages.albumBetaProtected);
		await expect(
			publicPage.locator('input[type="password"]')
		).toBeVisible();
		await expect(
			publicPage.locator(`#jtg-album-${catalog.albums.betaProtected.id}`)
		).toHaveCount(0);
		const denied = await visitor.request.get(
			'/wp-json/wp-abilities/v1/abilities/modula/recover-request/run?' +
				new URLSearchParams({ 'input[request_id]': input.request_id })
		);
		expect([401, 403]).toContain(denied.status());
		await evidence.capture(page, 'abilities-album-editor');
		await testInfo.attach('album-mcp-outcome', {
			body: JSON.stringify(out, null, 2),
			contentType: 'application/json',
		});
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('Album lifecycle and preset application through MCP preserve public composition', async ({
	page,
	evidence,
}, testInfo) => {
	await page.goto(catalog.galleries.visible.editor);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Album lifecycle E2E', version: '1' },
		})
	).session;
	const prefix = process.env.MODULA_E2E_RUN + '-mcp-life';
	const id = catalog.albums?.abilityAlbum?.id || catalog.galleries.visible.id;
	if (mode === 'lite') {
		for (const name of [
			'modula/duplicate-album',
			'modula/apply-album-preset',
		]) {
			const input = {
				request_id: prefix + name.split('/')[1],
				id,
				revision: '0'.repeat(64),
				...(name.includes('duplicate')
					? { status: 'draft' }
					: { preset_id: id, preset_revision: '0'.repeat(64) }),
			};
			expect((await call(page, name, input, session)).status).toBe(
				'forbidden'
			);
		}
		return;
	}
	const api = (route) =>
		page.evaluate(
			(apiPath) => window.wp.apiFetch({ path: apiPath }),
			route
		);
	const originalMembers = (
		await call(page, 'modula/read-album-members', { id }, session)
	).members;
	const lifeRead = await call(
		page,
		'modula/read-album-lifecycle',
		{ id },
		session
	);
	const duplicateInput = {
		request_id: prefix + '-duplicate',
		id,
		revision: lifeRead.revision,
		status: 'draft',
	};
	const concurrentCopies = await Promise.all(
		[0, 1].map(() =>
			call(page, 'modula/duplicate-album', duplicateInput, session)
		)
	);
	expect(concurrentCopies.map((row) => row.status)).toContain('succeeded');
	for (const row of concurrentCopies) {
		expect(['succeeded', 'in_progress']).toContain(row.status);
	}
	const duplicate = await call(
		page,
		'modula/duplicate-album',
		duplicateInput,
		session
	);
	for (const row of concurrentCopies.filter(
		(entry) => entry.status === 'succeeded'
	)) {
		expect(row.album.id).toBe(duplicate.album.id);
	}
	expect(duplicate.status).toBe('succeeded');
	expect(
		await call(page, 'modula/duplicate-album', duplicateInput, session)
	).toEqual(duplicate);
	const copyId = duplicate.album.id;
	await page.goto(duplicate.album.editor_url);
	await expect(page.locator('#modula-album-takeover-root')).toBeVisible();
	expect(
		(await call(page, 'modula/read-album-members', { id: copyId }, session))
			.members
	).toEqual(originalMembers);
	const preset = await call(
		page,
		'modula/create-album-preset',
		{
			request_id: prefix + '-preset',
			title: 'MCP apply album',
			status: 'publish',
			sorting: 'manual',
			settings: { layout: { gutter: 43 } },
		},
		session
	);
	expect(preset.status).toBe('succeeded');
	const source = {
		preset_id: preset.preset.id,
		preset_revision: preset.preset.revision,
	};
	const read = await call(page, 'modula/read-album', { id }, session);
	const batch = {
		request_id: prefix + '-batch',
		...source,
		targets: [
			{ id, revision: read.album.revision },
			{ id: copyId, revision: '0'.repeat(64) },
		],
	};
	const applied = await call(
		page,
		'modula/apply-album-presets',
		batch,
		session
	);
	expect(applied.status).toBe('partial');
	expect(applied.targets.map((row) => row.status)).toEqual([
		'succeeded',
		'conflict',
	]);
	expect(
		await call(page, 'modula/apply-album-presets', batch, session)
	).toEqual(applied);
	await page.goto(applied.targets[0].album.editor_url);
	await expect(page.locator('#modula-album-takeover-root')).toBeVisible();
	expect((await api(`/modula/v2/album/${id}/settings`)).layout.gutter).toBe(
		43
	);
	expect(
		(await call(page, 'modula/read-album-members', { id }, session)).members
	).toEqual(originalMembers);
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		const publicCheck = async (visible) => {
			await publicPage.goto(catalog.pages.abilityAlbum);
			const root = publicPage.locator(`#jtg-album-${id}`);
			if (!visible) {
				await expect(root).toHaveCount(0);
				return;
			}
			await expect(root).toBeVisible();
			expect(
				JSON.parse(await root.getAttribute('data-config')).gutter
			).toBe(43);
			expect(
				await root
					.locator('.modula-item a[data-gallery-id]')
					.evaluateAll((nodes) =>
						nodes.map((node) => Number(node.dataset.galleryId))
					)
			).toEqual(originalMembers.map((row) => row.id));
		};
		await publicCheck(true);
		const mutate = async (verb, status) => {
			const current = await call(
				page,
				'modula/read-album-lifecycle',
				{ id },
				session
			);
			const input = {
				request_id: prefix + '-' + verb,
				id,
				revision: current.revision,
				...(status ? { status } : {}),
			};
			const result = await call(
				page,
				`modula/${verb}-album`,
				input,
				session
			);
			expect(result.status).toBe('succeeded');
			expect(
				await call(page, `modula/${verb}-album`, input, session)
			).toEqual(result);
			return result;
		};
		await mutate('trash');
		await publicCheck(false);
		const restored = await mutate('restore', 'publish');
		await publicCheck(true);
		await page.goto(restored.album.editor_url);
		await expect(page.locator('#modula-album-takeover-root')).toBeVisible();
		expect(
			(await call(page, 'modula/read-album-members', { id }, session))
				.members
		).toEqual(originalMembers);
		await evidence.capture(publicPage, 'album-lifecycle-restored');
		await mutate('delete');
		await publicCheck(false);
		const denied = await visitor.request.get(
			'/wp-json/wp-abilities/v1/abilities/modula/recover-request/run?' +
				new URLSearchParams({ 'input[request_id]': prefix + '-delete' })
		);
		expect([401, 403]).toContain(denied.status());
		await testInfo.attach('album-lifecycle-and-application', {
			body: JSON.stringify({ duplicate, applied }),
			contentType: 'application/json',
		});
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
