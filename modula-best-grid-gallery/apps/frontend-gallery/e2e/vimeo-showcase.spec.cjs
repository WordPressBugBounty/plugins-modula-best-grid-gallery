const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./evidence.cjs');
const { native, mcp, toolData } = require('./abilities-client.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const run = path.basename(process.env.MODULA_E2E_RUN_DIR);
const browserOnly = Boolean(process.env.MODULA_E2E_VIMEO_BROWSER_ONLY);
const importOnly = process.env.MODULA_E2E_VIMEO_BROWSER_ONLY === 'import';
if (browserOnly) test.use({ trace: 'off' });
const gallery = catalog.galleries.visible;
const source = 'https://www.vimeo.com/showcase/12429567/?fl=so&fe=fs';
const videoUrls = [76979871, 22439234, 146022717, 1084537].map(
	(id) => `https://vimeo.com/${id}`
);
async function open(page, context) {
	await context.setExtraHTTPHeaders({ 'X-Modula-E2E-Vimeo': run });
	await page.goto(gallery.editor);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}
async function modal(page) {
	await page.getByRole('button', { name: 'Open add media menu' }).click();
	await page.getByRole('menuitem', { name: /video playlist/i }).click();
	return page.getByRole('dialog', { name: 'Video Playlist', exact: true });
}
const read = (page) => native(page, 'modula/read-gallery', { id: gallery.id });
if (process.env.MODULA_E2E_MODE !== 'pro') {
	(browserOnly ? test.skip : test)(
		'Showcase remains a Compatible Pro video workflow',
		async ({ page }) => {
			await page.goto(catalog.pages.visible);
			await expect(page.locator(`#modula-${gallery.id}`)).toBeVisible();
		}
	);
} else {
	(browserOnly ? test.skip : test)(
		'Showcase native and MCP resolution is bounded, replayable and never writes gallery items',
		async ({ page, context }) => {
			await open(page, context);
			const before = await read(page);
			const input = {
				id: gallery.id,
				revision: before.gallery.revision,
				request_id: run + '-vimeo-native',
				kind: 'playlist',
				url: source,
				max_sources: 2,
			};
			const result = await native(
				page,
				'modula/resolve-video-source',
				input,
				'POST'
			);
			expect(result.status).toBe('partial');
			expect(result.video.complete).toBe(false);
			expect(result.video.sources.map((row) => row.video_url)).toEqual(
				videoUrls.slice(0, 2)
			);
			await context.setExtraHTTPHeaders({
				'X-Modula-E2E-Vimeo': run,
				'X-Modula-E2E-Vimeo-Block': '1',
			});
			expect(
				await native(page, 'modula/resolve-video-source', input, 'POST')
			).toEqual(result);
			await context.setExtraHTTPHeaders({ 'X-Modula-E2E-Vimeo': run });
			const init = await mcp(page, 'initialize', {
				protocolVersion: '2025-06-18',
				capabilities: {},
				clientInfo: { name: 'Showcase E2E', version: '1' },
			});
			const mcpInput = {
				...input,
				request_id: run + '-vimeo-mcp',
				max_sources: 4,
			};
			const call = () =>
				mcp(
					page,
					'tools/call',
					{
						name: 'mcp-adapter-execute-ability',
						arguments: {
							ability_name: 'modula/resolve-video-source',
							parameters: mcpInput,
						},
					},
					init.session
				);
			const resolved = toolData(await call()).data;
			expect(resolved.status).toBe('succeeded');
			expect(resolved.video.sources.map((row) => row.video_url)).toEqual(
				videoUrls
			);
			await context.setExtraHTTPHeaders({
				'X-Modula-E2E-Vimeo': run,
				'X-Modula-E2E-Vimeo-Block': '1',
			});
			expect(toolData(await call()).data).toEqual(resolved);
			expect((await read(page)).items).toEqual(before.items);
		}
	);
	test('Showcase modal imports four ordered items, saves, reopens and opens the visitor Vimeo player', async ({
		page,
		context,
		evidence,
	}) => {
		await open(page, context);
		const before = await read(page);
		const dialog = await modal(page);
		await expect(
			dialog.getByText(/public Vimeo Showcase URL/)
		).toBeVisible();
		await dialog.getByLabel('Playlist URL', { exact: true }).fill(source);
		await dialog.getByRole('button', { name: 'Add', exact: true }).click();
		await expect(dialog).toBeHidden();
		await page.reload();
		await expect(
			page.getByRole('navigation', { name: 'Settings sections' })
		).toBeVisible();
		const saved = await read(page);
		expect(saved.items.length).toBe(before.items.length + 4);
		const persisted = await page.evaluate(
			(id) =>
				window.wp.apiFetch({ path: `/modula/v2/gallery/${id}/images` }),
			gallery.id
		);
		const imported = persisted.filter((row) =>
			videoUrls.includes(row.video_url)
		);
		expect(imported.map((row) => row.video_url)).toEqual(videoUrls);
		expect(
			imported.every(
				(row) =>
					row.video_title &&
					row.video_thumbnail &&
					Number(row.video_width) === 640 &&
					Number(row.video_height) === 360
			)
		).toBe(true);
		await evidence.capture(page, 'showcase-import-reopened');
		const visitor = await evidence.anonymous();
		try {
			// Only prove the existing Vimeo player handoff; provider playback needs live verification.
			await visitor.route('https://player.vimeo.com/video/**', (route) =>
				route.fulfill({
					contentType: 'text/html',
					body: '<html><body>Controlled Vimeo player boundary</body></html>',
				})
			);
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.visible);
			const frame = publicPage
				.locator(
					`#modula-${gallery.id} iframe[src*="player.vimeo.com/video/76979871"]`
				)
				.first();
			await expect(frame).toBeVisible();
			await expect(frame).toHaveAttribute(
				'src',
				/player\.vimeo\.com\/video\/76979871/
			);
			await evidence.capture(
				publicPage,
				'showcase-visitor-vimeo-handoff'
			);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
	(importOnly ? test.skip : test)(
		'Showcase errors retain editor contents and legacy AJAX returns the same ordered snaps',
		async ({ page, context, evidence }) => {
			await open(page, context);
			const before = await read(page);
			const dialog = await modal(page);
			await dialog
				.getByLabel('Playlist URL', { exact: true })
				.fill('https://vimeo.com/showcase/99002');
			await dialog
				.getByRole('button', { name: 'Add', exact: true })
				.click();
			await expect(
				dialog.getByText(/could not return the complete Showcase/)
			).toBeVisible();
			expect((await read(page)).items).toEqual(before.items);
			await evidence.capture(
				page,
				'showcase-page-failure-preserves-gallery'
			);
			await dialog
				.getByRole('button', { name: 'Cancel', exact: true })
				.click();
			for (const [id, message] of [
				[99003, 'no accessible videos'],
				[99004, 'Only public'],
				[99005, 'Some Showcase videos'],
			]) {
				const error = await page.evaluate(async (id) => {
					try {
						await window.wp.apiFetch({
							path: '/modula-video/v1/playlist-snap',
							method: 'POST',
							data: {
								playlist_url: `https://vimeo.com/showcase/${id}`,
							},
						});
						return null;
					} catch (err) {
						return err.message;
					}
				}, id);
				expect(error).toContain(message);
			}
			await page.goto(catalog.galleries.classicSlider.editor);
			const snaps = await page.evaluate(async (url) => {
				const response = await fetch(modula_video_ajax.ajaxurl, {
					method: 'POST',
					body: new URLSearchParams({
						action: 'modula_video_get_playlist_snap',
						_ajax_nonce: modula_video_ajax.nonce,
						playlist_url: url,
					}),
				});
				return response.json();
			}, source);
			expect(snaps.success).toBe(true);
			expect(snaps.data.map((row) => row.video_url)).toEqual(videoUrls);
		}
	);
}
