const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const fs = require('fs');
const path = require('path');
const dir = process.env.MODULA_E2E_RUN_DIR;
const mode = process.env.MODULA_E2E_MODE;
const prefix = `${process.env.MODULA_E2E_RUN}-${mode}-admin-http`;
const result = JSON.parse(
	fs.readFileSync(path.join(dir, mode, 'abilities-administration.json'))
);
async function session(page) {
	return (
		await mcp(page, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'Administration intake E2E', version: '1' },
		})
	).session;
}
async function call(page, name, input, token) {
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
			token
		)
	).data;
}
async function rest(page, route, method = 'GET', data) {
	return page.evaluate(
		({ route, method, data }) =>
			window.wp.apiFetch({
				path: route,
				method,
				...(data ? { data } : {}),
			}),
		{ route, method, data }
	);
}
test('MCP Modula Settings preserve sparse fields and ordinary admin conflicts', async ({
	page,
	evidence,
}) => {
	await page.goto('/wp-admin/edit.php?post_type=modula-gallery&page=modula');
	const token = await session(page);
	const read = await call(page, 'read-site-settings', {}, token);
	expect(read.revision).toMatch(/^[a-f0-9]{64}$/);
	expect(JSON.stringify(read)).not.toContain('fixture-secret');
	const input = {
		request_id: `${prefix}-settings`,
		revision: read.revision,
		settings: {
			modula_image_licensing_option: {
				image_licensing_author: 'MCP author',
			},
		},
	};
	const responses = await Promise.all([
		call(page, 'update-site-settings', input, token),
		call(page, 'update-site-settings', input, token),
	]);
	expect(responses.map((r) => r.status)).toContain('succeeded');
	const saved = await call(page, 'update-site-settings', input, token);
	expect(saved.status).toBe('succeeded');
	expect(
		await call(
			page,
			'recover-request',
			{ request_id: input.request_id },
			token
		)
	).toEqual(saved);
	await page.reload();
	// Existing administration renders the value through its own Settings schema.
	const imageTab = page.getByRole('button', {
		name: 'Image Licensing',
		exact: true,
	});
	if (await imageTab.count()) await imageTab.click();
	else
		await page
			.getByText('Image Licensing', { exact: true })
			.first()
			.click();
	await expect(
		page.getByRole('textbox', { name: 'Author', exact: true })
	).toHaveValue('MCP author');
	await evidence.capture(page, 'modula-settings-reopened');
	const before = await native(page, 'modula/read-site-settings', {});
	await rest(page, '/modula-best-grid-gallery/v1/general-settings', 'POST', {
		modula_image_licensing_option: {
			image_licensing_author: 'Human author',
			image_licensing_company: 'Preserve company',
		},
	});
	const stale = await call(
		page,
		'update-site-settings',
		{ ...input, request_id: `${prefix}-stale`, revision: before.revision },
		token
	);
	expect(stale.status).toBe('conflict');
	expect(await call(page, 'update-site-settings', input, token)).toEqual(
		saved
	);
	expect(
		(await call(page, 'read-site-settings', {}, token)).settings
			.modula_image_licensing_option.image_licensing_author
	).toBe('Human author');
	if (mode === 'pro') {
		const current = await call(page, 'read-site-settings', {}, token);
		const prior = current.extensions['modula-albums'].enabled;
		const toggle = {
			request_id: `${prefix}-extension-off`,
			revision: current.revision,
			extension: 'modula-albums',
			enabled: false,
		};
		expect((await call(page, 'set-extension', toggle, token)).status).toBe(
			'succeeded'
		);
		const discovery = await call(
			page,
			'discover',
			{ per_page: 100 },
			token
		);
		expect(
			discovery.operations.find((op) => op.name === 'modula/create-album')
				.status
		).toBe('unavailable');
		const disabled = await call(page, 'read-site-settings', {}, token);
		expect(disabled.extensions['modula-albums'].enabled).toBe(false);
		expect(
			(
				await call(
					page,
					'set-extension',
					{
						...toggle,
						request_id: `${prefix}-extension-restore`,
						revision: disabled.revision,
						enabled: prior,
					},
					token
				)
			).status
		).toBe('succeeded');
	}
});
test('MCP upload and ZIP survive Media Library, editor save/reopen and anonymous rendering', async ({
	page,
	evidence,
}) => {
	await page.goto(result.gallery.editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const token = await session(page);
	const gallery = async () =>
		await call(page, 'read-gallery', { id: result.gallery.id }, token);
	const input = {
		request_id: `${prefix}-upload`,
		filename: `${prefix}.jpg`,
		content_base64: fs.readFileSync(
			path.join(dir, mode, 'intake-image.txt'),
			'utf8'
		),
		id: result.gallery.id,
		revision: (await gallery()).gallery.revision,
	};
	const responses = await Promise.all([
		call(page, 'upload-image', input, token),
		call(page, 'upload-image', input, token),
	]);
	expect(responses.map((row) => row.status)).toContain('succeeded');
	const uploaded = await call(page, 'upload-image', input, token);
	expect(uploaded.status).toBe('succeeded');
	expect(
		await call(
			page,
			'recover-request',
			{ request_id: input.request_id },
			token
		)
	).toEqual(uploaded);
	const id = uploaded.intake.attachment_ids[0];
	const media = await rest(page, `/wp/v2/media/${id}?context=edit`);
	expect(media.mime_type).toBe('image/jpeg');
	await page.goto(
		`/wp-admin/upload.php?mode=list&s=${encodeURIComponent(prefix)}`
	);
	await expect(page.locator(`#post-${id}`)).toBeVisible();
	await evidence.capture(page, 'uploaded-media-library');
	await page.goto(result.gallery.editor_url);
	const archive = {
		request_id: `${prefix}-zip`,
		filename: `${prefix}.zip`,
		content_base64: fs.readFileSync(
			path.join(dir, mode, 'intake-zip.txt'),
			'utf8'
		),
		id: result.gallery.id,
		revision: (await gallery()).gallery.revision,
	};
	const zip = await call(page, 'import-zip', archive, token);
	expect(zip.status).toBe('succeeded');
	expect(zip.intake.attachment_ids).toHaveLength(2);
	expect(await call(page, 'import-zip', archive, token)).toEqual(zip);
	const expectedIds = (await gallery()).items.map((row) => row.id);
	expect(expectedIds).toHaveLength(6);
	await page.reload();
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	expect(
		(
			await rest(
				page,
				`/modula/v2/gallery/${result.gallery.id}/bootstrap?context=settings_editor`
			)
		).items.map((row) => row.id)
	).toEqual(expectedIds);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const saved = page.waitForResponse(
		(r) =>
			r
				.url()
				.includes(`/modula/v2/gallery/${result.gallery.id}/settings`) &&
			r.request().method() !== 'GET' &&
			r.status() === 200
	);
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.fill('27');
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.press('Tab');
	await saved;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
	await page.reload();
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	expect((await gallery()).items.map((row) => row.id)).toEqual(expectedIds);
	await evidence.capture(page, 'intake-editor-reopened');
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(result.page);
		const root = publicPage.locator(`#modula-${result.gallery.id}`);
		await root.scrollIntoViewIfNeeded();
		await expect(root.locator('.modula-item')).toHaveCount(6);
		await expect
			.poll(() =>
				root
					.locator('.modula-item img')
					.evaluateAll(
						(images) =>
							images.filter(
								(image) =>
									image.complete && image.naturalWidth > 0
							).length
					)
			)
			.toBe(6);
		for (const name of ['read-site-settings', 'upload-image']) {
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
								ability_name: `modula/${name}`,
								parameters:
									name === 'upload-image' ? input : {},
							},
						},
					},
				}
			);
			expect([401, 403]).toContain(denied.status());
		}
		await evidence.capture(publicPage, 'intake-anonymous-gallery');
	} finally {
		await visitor.close();
	}
});
