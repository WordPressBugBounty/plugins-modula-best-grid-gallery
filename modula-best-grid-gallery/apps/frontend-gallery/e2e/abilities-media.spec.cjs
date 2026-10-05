const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const fs = require('fs');
const path = require('path');
const dir = process.env.MODULA_E2E_RUN_DIR;
const mode = process.env.MODULA_E2E_MODE;
const result = JSON.parse(
	fs.readFileSync(path.join(dir, mode, 'abilities-media.json'))
);
const prefix = `${process.env.MODULA_E2E_RUN}-${mode}-media-mcp`;
async function call(page, name, input, session, mediaTrash = false) {
	return toolData(
		await mcp(
			page,
			'tools/call',
			{
				name: 'mcp-adapter-execute-ability',
				arguments: {
					ability_name: `modula/${name}`,
					parameters: input,
				},
			},
			session,
			mediaTrash
		)
	).data;
}
async function rest(page, route, method = 'GET', data) {
	return page.evaluate(
		({ route: routePath, method: httpMethod, data: payload }) =>
			window.wp.apiFetch({
				path: routePath,
				method: httpMethod,
				...(payload ? { data: payload } : {}),
			}),
		{ route, method, data }
	);
}
test('MCP organizer mutations preserve identities, permissions, replay and media bytes', async ({
	page,
	evidence,
}) => {
	expect(
		JSON.parse(
			fs.readFileSync(
				path.join(dir, mode, 'abilities-media-native-only.json')
			)
		).adapter_loaded
	).toBe(false);
	await page.goto(result.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Media E2E', version: '1' },
		})
	).session;
	const revision = async () =>
		(await call(page, 'list-media-folders', { page: 1 }, session)).revision;
	const input = {
		request_id: `${prefix}-create`,
		revision: await revision(),
		name: `${prefix}-folder`,
	};
	const parallel = await Promise.all([
		call(page, 'create-media-folder', input, session),
		call(page, 'create-media-folder', input, session),
	]);
	expect(parallel.map((r) => r.status)).toContain('succeeded');
	const created = await call(page, 'create-media-folder', input, session);
	expect(created.status).toBe('succeeded');
	expect(
		(
			await call(
				page,
				'list-media-folders',
				{ search: input.name },
				session
			)
		).total
	).toBe(1);
	const id = created.folder.id;
	const changed = await call(
		page,
		'create-media-folder',
		{ ...input, name: `${prefix}-different` },
		session
	);
	expect(changed.code).toBe('request_payload_mismatch');
	const assign = {
		request_id: `${prefix}-assign`,
		id: result.attachment_id,
		object_type: 'attachment',
		folder_id: id,
		revision: await revision(),
	};
	const assigned = await call(page, 'assign-media-folder', assign, session);
	expect(assigned.status).toBe('succeeded');
	expect(await call(page, 'assign-media-folder', assign, session)).toEqual(
		assigned
	);
	const members = await call(
		page,
		'list-attachments',
		{ folder_id: id, per_page: 1 },
		session
	);
	expect(members.total).toBe(1);
	expect(members.attachments[0].id).toBe(result.attachment_id);
	const updated = await call(
		page,
		'update-media-folder',
		{
			request_id: `${prefix}-rename`,
			id,
			revision: await revision(),
			changes: { name: `${prefix}-renamed` },
		},
		session
	);
	expect(updated.status).toBe('succeeded');
	await page.goto('/wp-admin/upload.php?page=wpchill-folders');
	const label = page
		.locator('.wpchill-folders-tree__label')
		.filter({ hasText: `${prefix}-renamed` });
	await expect(label).toBeVisible();
	await label.click();
	await expect(
		page.getByText('Later library title', { exact: true })
	).toBeVisible();
	await evidence.capture(page, 'organizer-assigned-member');
	await page.reload();
	await expect(
		page
			.locator('.wpchill-folders-tree__label')
			.filter({ hasText: `${prefix}-renamed` })
	).toBeVisible();
	await page.goto(result.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const before = await revision();
	await rest(page, `/wpchill-folders/v1/folders/${id}`, 'PATCH', {
		name: `${prefix}-human`,
	});
	const stale = await call(
		page,
		'update-media-folder',
		{
			request_id: `${prefix}-stale`,
			id,
			revision: before,
			changes: { name: `${prefix}-lost` },
		},
		session
	);
	expect(stale.status).toBe('conflict');
	const raceInput = {
		request_id: `${prefix}-folder-race`,
		id,
		revision: await revision(),
		changes: { name: `${prefix}-ability` },
	};
	const folderRace = await Promise.all([
		call(page, 'update-media-folder', raceInput, session),
		page.evaluate(
			async ({ id: folderId, name }) => {
				await new Promise((resolve) => setTimeout(resolve, 250));
				return window.wp.apiFetch({
					path: `/wpchill-folders/v1/folders/${folderId}`,
					method: 'PATCH',
					data: { name },
				});
			},
			{ id, name: `${prefix}-human-after-lock` }
		),
	]);
	expect(folderRace[0].status).toBe('succeeded');
	expect(
		(
			await call(
				page,
				'list-media-folders',
				{ search: `${prefix}-human-after-lock` },
				session
			)
		).folders[0].id
	).toBe(id);
	expect(await call(page, 'update-media-folder', raceInput, session)).toEqual(
		folderRace[0]
	);
	const remove = {
		request_id: `${prefix}-delete`,
		id,
		revision: await revision(),
	};
	const deleted = await call(page, 'delete-media-folder', remove, session);
	expect(deleted.status).toBe('succeeded');
	expect(
		await call(
			page,
			'recover-request',
			{ request_id: remove.request_id },
			session
		)
	).toEqual(deleted);
	expect(await call(page, 'delete-media-folder', remove, session)).toEqual(
		deleted
	);
	expect(
		(
			await call(
				page,
				'read-attachment',
				{ id: result.attachment_id },
				session
			)
		).attachment.folder_id
	).toBe(0);
	await page.goto('/wp-admin/upload.php?page=wpchill-folders');
	await expect(
		page
			.locator('.wpchill-folders-tree__label')
			.filter({ hasText: `${prefix}-human` })
	).toHaveCount(0);
});

test('MCP shared attachment text survives both gallery editors and anonymous rendering', async ({
	page,
	evidence,
}) => {
	await page.goto(result.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Attachment E2E', version: '1' },
		})
	).session;
	const before = [];
	for (const gallery of result.galleries) {
		before.push(
			await rest(page, `/modula/v2/gallery/${gallery.id}/images`)
		);
	}
	const id = result.attachment_id;
	const tools = await mcp(page, 'tools/list', {}, session);
	const imageTool = tools.body.result.tools.find(
		(tool) => tool.name === 'modula-read-attachment-image'
	);
	expect(imageTool).toBeDefined();
	expect(imageTool.outputSchema).toBeUndefined();
	expect(imageTool.inputSchema.required).toEqual([
		'id',
		'revision',
		'visual_revision',
	]);
	const visual = await call(
		page,
		'read-attachment-image-context',
		{ id },
		session
	);
	const visualInput = {
		id,
		revision: visual.revision,
		visual_revision: visual.visual_revision,
	};
	const pixels = await mcp(
		page,
		'tools/call',
		{
			name: 'modula-read-attachment-image',
			arguments: visualInput,
		},
		session
	);
	expect(pixels.body.error).toBeUndefined();
	expect(pixels.body.result.isError).toBe(false);
	expect(pixels.body.result.content.map((block) => block.type)).toEqual([
		'image',
	]);
	const image = pixels.body.result.content[0];
	expect(image._meta.modula).toEqual(visualInput);
	const dimensions = await page.evaluate(async ({ data, mimeType }) => {
		const img = new Image();
		img.src = `data:${mimeType};base64,${data}`;
		await img.decode();
		return [img.naturalWidth, img.naturalHeight];
	}, image);
	expect(dimensions).toEqual([visual.width, visual.height]);
	expect(Buffer.from(image.data, 'base64').length).toBeLessThanOrEqual(
		2097152
	);
	const generic = await mcp(
		page,
		'tools/call',
		{
			name: 'mcp-adapter-execute-ability',
			arguments: {
				ability_name: 'modula/read-attachment-image',
				parameters: visualInput,
			},
		},
		session
	);
	expect(generic.body.result.content.map((block) => block.type)).toEqual([
		'text',
	]);
	expect(toolData(generic).data.visual_revision).toBe(visual.visual_revision);
	const read = await call(page, 'read-attachment', { id }, session);
	const text = {
		title: `MCP shared title ${mode}`,
		description: `<p>MCP shared description ${mode}</p>`,
		caption: `MCP shared caption ${mode}`,
		alt: `MCP shared alt ${mode}`,
	};
	const input = {
		request_id: `${prefix}-text`,
		visual_revision: visual.visual_revision,
		id,
		revision: read.attachment.revision,
		text,
	};
	const saved = await call(page, 'update-attachment-text', input, session);
	expect(saved.status).toBe('succeeded');
	expect(saved.attachment.text).toEqual(text);
	const stalePixels = await mcp(
		page,
		'tools/call',
		{ name: 'modula-read-attachment-image', arguments: visualInput },
		session
	);
	expect(stalePixels.body.result.isError).toBe(true);
	expect(
		stalePixels.body.result.content.every((block) => block.type === 'text')
	).toBe(true);
	expect(
		await call(
			page,
			'recover-request',
			{ request_id: input.request_id },
			session
		)
	).toEqual(saved);
	const usage = await call(
		page,
		'read-attachment-usage',
		{ id, per_page: 1 },
		session
	);
	expect(usage.total).toBe(3);
	expect(usage.usages).toHaveLength(1);
	expect(usage.scope).toContain('not covered');
	for (const [index, gallery] of result.galleries.entries()) {
		await page.goto(gallery.editor_url);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		const items = (
			await rest(
				page,
				`/modula/v2/gallery/${gallery.id}/bootstrap?context=settings_editor`
			)
		).items;
		expect(items.map((row) => row.id)).toEqual(
			before[index].map((row) => row.id)
		);
		expect(items[0]).toMatchObject({
			title: text.title,
			alt: text.alt,
			description: text.description,
		});
		await page
			.getByRole('button', { name: 'Gallery layout', exact: true })
			.click();
		const savedResponse = page.waitForResponse(
			(response) =>
				response
					.url()
					.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
				response.request().method() !== 'GET' &&
				response.status() === 200
		);
		await page
			.getByRole('spinbutton', { name: 'Value', exact: true })
			.fill('27');
		await page
			.getByRole('spinbutton', { name: 'Value', exact: true })
			.press('Tab');
		await savedResponse;
		await expect(
			page.locator('.modula-gallery-takeover__topbar-save-status')
		).toHaveText('Saved');
		await page.reload();
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		expect(
			(
				await rest(
					page,
					`/modula/v2/gallery/${gallery.id}/bootstrap?context=settings_editor`
				)
			).items[0].alt
		).toBe(text.alt);
	}
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(result.page);
		for (const gallery of result.galleries) {
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await root.scrollIntoViewIfNeeded();
			await expect(
				root.getByRole('img', { name: text.alt, exact: true })
			).toBeVisible();
			await expect(root.locator('.modula-item')).toHaveCount(1);
		}
		const denied = await publicPage.request.post(
			'/wp-json/mcp/mcp-adapter-default-server',
			{
				headers: { 'X-Modula-E2E-Run': process.env.MODULA_E2E_RUN },
				data: {
					jsonrpc: '2.0',
					id: 1,
					method: 'tools/call',
					params: {
						name: 'mcp-adapter-execute-ability',
						arguments: {
							ability_name: 'modula/read-attachment',
							parameters: { id },
						},
					},
				},
			}
		);
		expect([401, 403]).toContain(denied.status());
		await evidence.capture(publicPage, 'shared-text-two-galleries');
	} finally {
		await visitor.close();
	}
	// Two simultaneous revisions: exactly one wins; the other reports a conflict.
	const current = await native(page, 'modula/read-attachment', { id });
	const updates = await Promise.all(
		['one', 'two'].map((suffix) =>
			call(
				page,
				'update-attachment-text',
				{
					request_id: `${prefix}-race-${suffix}`,
					id,
					revision: current.attachment.revision,
					text: { title: `Winner ${suffix}` },
				},
				session
			)
		)
	);
	expect(updates.map((row) => row.status).sort()).toEqual([
		'conflict',
		'succeeded',
	]);
	const raceInput = {
		request_id: `${prefix}-text-race`,
		id,
		revision: (await call(page, 'read-attachment', { id }, session))
			.attachment.revision,
		text: { title: 'Ability before human' },
	};
	const textRace = await Promise.all([
		call(page, 'update-attachment-text', raceInput, session),
		page.evaluate(async (attachmentId) => {
			await new Promise((resolve) => setTimeout(resolve, 250));
			return window.wp.apiFetch({
				path: `/wp/v2/media/${attachmentId}`,
				method: 'POST',
				data: { title: 'Human after locked write' },
			});
		}, id),
	]);
	expect(textRace[0].status).toBe('succeeded');
	expect(
		(await call(page, 'read-attachment', { id }, session)).attachment.text
			.title
	).toBe('Human after locked write');
	expect(
		await call(page, 'update-attachment-text', raceInput, session)
	).toEqual(textRace[0]);
	await rest(page, `/wp/v2/media/${id}`, 'POST', {
		title: `Later human ${mode}`,
	});
	expect(await call(page, 'update-attachment-text', input, session)).toEqual(
		saved
	);
	expect(
		(await call(page, 'read-attachment', { id }, session)).attachment.text
			.title
	).toBe(`Later human ${mode}`);
});

test('MCP collections and site favorites survive organizer reopen without moving media', async ({
	page,
	evidence,
}) => {
	await page.goto(result.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Organization E2E', version: '1' },
		})
	).session;
	const id = result.attachment_id;
	const before = (await call(page, 'read-attachment', { id }, session))
		.attachment;
	const revision = async () =>
		(await call(page, 'list-favorites', { page: 1 }, session)).revision;
	const star = {
		request_id: `${prefix}-star`,
		id,
		revision: await revision(),
	};
	const starred = await call(page, 'add-favorite', star, session);
	expect(starred.status).toBe('succeeded');
	expect(await call(page, 'add-favorite', star, session)).toEqual(starred);
	await page.goto('/wp-admin/upload.php?page=wpchill-folders');
	await page.getByRole('button', { name: /^Favorites/ }).click();
	await expect(
		page.getByText(before.text.title, { exact: true })
	).toBeVisible();
	await page.reload();
	await page.getByRole('button', { name: /^Favorites/ }).click();
	await expect(
		page.getByText(before.text.title, { exact: true })
	).toBeVisible();
	await evidence.capture(page, 'favorite-reopened');
	await page.goto(result.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	if (mode === 'pro') {
		const create = {
			request_id: `${prefix}-collection`,
			name: `${prefix}-collection`,
			color: '#2271b1',
			revision: await revision(),
		};
		const created = await call(page, 'create-collection', create, session);
		expect(created.status).toBe('succeeded');
		const collectionId = created.collection.id;
		const recolored = await call(
			page,
			'update-collection',
			{
				request_id: `${prefix}-recolor`,
				id: collectionId,
				revision: await revision(),
				changes: { color: '#dba617' },
			},
			session
		);
		expect(recolored.status).toBe('succeeded');
		expect(recolored.collection.color).toBe('#dba617');
		const add = {
			request_id: `${prefix}-label`,
			id,
			collection_id: collectionId,
			revision: await revision(),
		};
		const concurrent = await Promise.all([
			call(page, 'add-collection-member', add, session),
			call(page, 'add-collection-member', add, session),
		]);
		expect(concurrent.map((row) => row.status)).toContain('succeeded');
		const members = await call(
			page,
			'list-collection-members',
			{ id: collectionId, per_page: 1 },
			session
		);
		expect(members.total).toBe(1);
		expect(members.attachments[0].id).toBe(id);
		await page.goto('/wp-admin/upload.php?page=wpchill-folders');
		await page
			.locator('.wpchill-folders-collections button')
			.filter({ hasText: create.name })
			.click();
		await expect(
			page.getByText(before.text.title, { exact: true })
		).toBeVisible();
		await page.reload();
		await expect(
			page
				.locator('.wpchill-folders-collections button')
				.filter({ hasText: create.name })
		).toBeVisible();
		await page
			.locator('.wpchill-folders-collections button')
			.filter({ hasText: create.name })
			.click();
		await expect(
			page.getByText(before.text.title, { exact: true })
		).toBeVisible();
		await evidence.capture(page, 'collection-reopened');
		await page.goto(result.galleries[0].editor_url);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		const staleRevision = await revision();
		await rest(
			page,
			`/wpchill-folders/v1/collections/${collectionId}`,
			'PATCH',
			{ name: `${prefix}-human-collection` }
		);
		expect(
			(
				await call(
					page,
					'update-collection',
					{
						request_id: `${prefix}-stale-collection`,
						id: collectionId,
						revision: staleRevision,
						changes: { name: `${prefix}-lost` },
					},
					session
				)
			).status
		).toBe('conflict');
		const removed = await call(
			page,
			'remove-collection-member',
			{
				...add,
				request_id: `${prefix}-unlabel`,
				revision: await revision(),
			},
			session
		);
		expect(removed.status).toBe('succeeded');
		expect(
			(
				await call(
					page,
					'list-collection-members',
					{ id: collectionId },
					session
				)
			).total
		).toBe(0);
		const remove = {
			request_id: `${prefix}-delete-collection`,
			id: collectionId,
			revision: await revision(),
		};
		const deleted = await call(page, 'delete-collection', remove, session);
		expect(deleted.status).toBe('succeeded');
		expect(
			await call(
				page,
				'recover-request',
				{ request_id: remove.request_id },
				session
			)
		).toEqual(deleted);
	}
	const removedStar = await call(
		page,
		'remove-favorite',
		{ ...star, request_id: `${prefix}-unstar`, revision: await revision() },
		session
	);
	expect(removedStar.status).toBe('succeeded');
	expect(
		(await call(page, 'read-attachment', { id }, session)).attachment
	).toEqual(before);
	const visitor = await evidence.anonymous();
	try {
		const response = await visitor.request.get(
			'/wp-json/wp-abilities/v1/abilities/modula/list-favorites/run?input[page]=1'
		);
		expect([401, 403]).toContain(response.status());
	} finally {
		await visitor.close();
	}
});

test('MCP local deletion reports each target and recovers after Media Library removal', async ({
	page,
	evidence,
}) => {
	await page.goto(result.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const session = (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Lifecycle E2E', version: '1' },
		})
	).session;
	const id = result.lifecycle.id;
	const current = (await call(page, 'read-attachment', { id }, session))
		.attachment;
	const trash = await call(
		page,
		'trash-attachment',
		{
			request_id: `${prefix}-trash-disabled`,
			id,
			revision: current.revision,
		},
		session
	);
	expect(trash.code).toBe('media_trash_disabled');
	const enabledTrash = await call(
		page,
		'trash-attachment',
		{
			request_id: `${prefix}-trash-enabled`,
			id,
			revision: current.revision,
		},
		session,
		true
	);
	expect(enabledTrash.status).toBe('succeeded');
	expect(enabledTrash.attachment.status).toBe('trash');
	const restored = await call(
		page,
		'restore-attachment',
		{
			request_id: `${prefix}-restore-enabled`,
			id,
			revision: enabledTrash.attachment.revision,
		},
		session,
		true
	);
	expect(restored.status).toBe('succeeded');
	expect(restored.attachment.status).toBe('inherit');
	current.revision = restored.attachment.revision;
	await page.goto(
		`/wp-admin/upload.php?mode=list&s=${encodeURIComponent(current.text.title)}`
	);
	await expect(page.locator(`#post-${id}`)).toBeVisible();
	await page.goto(result.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const inUse = (
		await call(
			page,
			'read-attachment',
			{ id: result.attachment_id },
			session
		)
	).attachment;
	const batch = {
		request_id: `${prefix}-delete-batch`,
		targets: [
			{
				operation: 'modula/delete-attachment',
				id,
				revision: current.revision,
			},
			{
				operation: 'modula/delete-attachment',
				id: inUse.id,
				revision: inUse.revision,
			},
		],
	};
	const deleted = await call(page, 'update-media-batch', batch, session);
	expect(deleted.status).toBe('partial');
	expect(deleted.targets[0].status).toBe('succeeded');
	expect(deleted.targets[1].code).toBe('attachment_in_use');
	expect(fs.existsSync(result.lifecycle.file)).toBe(false);
	expect(await call(page, 'update-media-batch', batch, session)).toEqual(
		deleted
	);
	expect(
		await call(
			page,
			'recover-request',
			{ request_id: batch.request_id },
			session
		)
	).toEqual(deleted);
	expect(
		(await call(page, 'read-attachment', { id: inUse.id }, session))
			.attachment.id
	).toBe(inUse.id);
	await page.goto(
		`/wp-admin/upload.php?mode=list&s=${encodeURIComponent(current.text.title)}`
	);
	await expect(page.locator(`#post-${id}`)).toHaveCount(0);
	await evidence.capture(page, 'media-library-deletion');
});
