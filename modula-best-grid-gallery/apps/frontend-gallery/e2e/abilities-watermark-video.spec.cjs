const { test, expect } = require('./evidence.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const mode = process.env.MODULA_E2E_MODE;
const fixture = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			mode,
			'abilities-watermark-video-http.json'
		)
	)
);
test('watermark and video operations are extension gated', async ({ page }) => {
	const catalog = JSON.parse(
		fs.readFileSync(
			path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json')
		)
	);
	await page.goto(
		catalog.galleries.visible.editor_url ||
			`http://localhost:10003/wp-admin/post.php?post=${catalog.galleries.visible.id}&action=edit`
	);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	expect(fixture.passed).toBe(true);
	expect(fixture.anonymous_denied).toBe(true);
});
test.describe('Compatible Pro file and video journey', () => {
	test.skip(mode !== 'pro', 'Compatible Pro extensions required');
	test('shared watermark bytes and video identities survive editor save/reopen and public playback', async ({
		page,
		evidence,
	}) => {
		for (const gallery of fixture.galleries) {
			await page.goto(gallery.editor_url);
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
			const before = await page.evaluate(
				(id) =>
					window.wp.apiFetch({
						path: `/modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
					}),
				gallery.id
			);
			expect(JSON.stringify(before)).toContain('Preserved watermark alt');
			if (gallery.id === fixture.galleries[0].id) {
				expect(JSON.stringify(before)).toContain('MCP local video');
			}
			await page.evaluate(
				(id) =>
					window.wp.apiFetch({
						path: `/modula/v2/gallery/${id}/settings`,
						method: 'PATCH',
						data: {
							layout: { gutter: 17 },
							performance: { lazyLoad: false },
						},
					}),
				gallery.id
			);
			await page.reload();
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
			const after = await page.evaluate(
				(id) =>
					window.wp.apiFetch({
						path: `/modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
					}),
				gallery.id
			);
			expect(JSON.stringify(after)).toContain('Preserved watermark alt');
			if (gallery.id === fixture.galleries[0].id) {
				expect(JSON.stringify(after)).toContain('video_template_9100');
			}
		}
		await evidence.capture(page, 'watermark-editor-reopened');
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(fixture.page);
			for (const gallery of fixture.galleries) {
				const root = publicPage.locator(`#modula-${gallery.id}`);
				await root.scrollIntoViewIfNeeded();
				const img = root.locator('img').first();
				await expect(img).toBeVisible();
				await expect
					.poll(() =>
						img.evaluate((el) => el.complete && el.naturalWidth > 0)
					)
					.toBe(true);
				// Real decoded watermark pixels in the centre, rather than merely an image URL.
				const bright = await img.evaluate((el) => {
					const c = document.createElement('canvas');
					c.width = el.naturalWidth;
					c.height = el.naturalHeight;
					const ctx = c.getContext('2d');
					ctx.drawImage(el, 0, 0);
					const p = ctx.getImageData(0, 0, c.width, c.height).data;
					let count = 0;
					for (let n = 0; n < p.length; n += 4) {
						if (p[n] > 190 && p[n + 1] > 190 && p[n + 2] > 190) {
							count++;
						}
					}
					return count;
				});
				expect(bright).toBeGreaterThan(20);
			}
			const media = await (
				await publicPage.request.get(
					`http://localhost:10003/wp-json/wp/v2/media/${fixture.attachment_id}`
				)
			).json();
			const bytes = await (
				await publicPage.request.get(media.source_url)
			).body();
			expect(
				crypto.createHash('sha256').update(bytes).digest('hex')
			).toBe(fixture.watermark.sha256);
			const root = publicPage.locator(
				`#modula-${fixture.galleries[0].id}`
			);
			await root.scrollIntoViewIfNeeded();
			const links = root.locator(
				'.modula-item-link[data-image-id="video_template_9100"]'
			);
			await expect(links.first()).toBeVisible();
			await links.first().click();
			const video = publicPage
				.locator('.fancybox__container video')
				.first();
			await expect(video).toBeVisible();
			await expect
				.poll(() => video.evaluate((el) => el.readyState))
				.toBeGreaterThanOrEqual(2);
			expect(
				await video.evaluate((el) => el.currentSrc || el.src)
			).toContain('sample.mp4');
			await expect.poll(() => video.evaluate((el) => el.loop)).toBe(true);
			await video.evaluate(async (el) => {
				el.muted = true;
				await el.play();
			});

			await evidence.capture(
				publicPage,
				'watermark-shared-and-video-playing'
			);
			await publicPage
				.locator('.fancybox__container [data-fancybox-close]')
				.first()
				.click();
			await expect(
				publicPage.locator('.fancybox__container')
			).toHaveCount(0);
			if (fixture.playlist?.items?.length) {
				for (const item of fixture.playlist.items) {
					await expect(
						root.locator(
							`.modula-item-link[data-image-id="${item.id}"]`
						)
					).toBeVisible();
				}
				await root
					.locator(
						`.modula-item-link[data-image-id="${fixture.playlist.items[0].id}"]`
					)
					.click();
				const youtube = publicPage
					.locator('.fancybox__container iframe')
					.first();
				await expect(youtube).toBeVisible();
				await expect(youtube).toHaveAttribute('src', /youtube.*embed/);
				await expect(
					publicPage
						.frameLocator('.fancybox__container iframe')
						.locator('.html5-video-player')
				).toBeVisible({ timeout: 20000 });
				await evidence.capture(
					publicPage,
					'real-playlist-public-player'
				);
			}
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
});
