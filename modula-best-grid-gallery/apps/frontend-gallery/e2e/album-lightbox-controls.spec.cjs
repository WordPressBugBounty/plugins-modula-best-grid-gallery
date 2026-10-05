const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Core Albums Lightbox settings survive PATCH → reopen and drive anonymous
 * open / navigate / close / caption / thumbs. Play/share/slideshow values are
 * preserved for ticket 08. A member gallery with supported video still opens.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album lightbox journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album lightbox core settings PATCH reopen and public interaction', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaLightbox;
		expect(album?.id).toBeTruthy();
		expect(album?.imageGalleryId).toBeTruthy();
		expect(album?.videoGalleryId).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.lightbox?.enableLightbox).toBe(true);
		expect(before?.lightbox?.enableNavigation).toBe(true);
		expect(before?.lightbox?.enableThumbs).toBe(false);
		expect(before?.lightbox?.showImageCaption).toBe(false);
		// Ticket 08 values seeded for preservation.
		expect(before?.lightbox?.enableShare).toBe(true);
		expect(before?.lightbox?.lightboxFacebook).toBe(true);
		expect(before?.lightbox?.enableSlideshow).toBe(true);
		expect(before?.lightbox?.slideshowDuration).toBe(4500);
		expect(before?.lightbox?.enablePlay).toBe(true);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					lightbox: {
						enableLightbox: true,
						enableNavigation: true,
						loopLightbox: true,
						doubleClick: false,
						showImageTitle: true,
						showImageCaption: true,
						captionPosition: 'center',
						lightboxToolbar: true,
						lightboxClose: true,
						enableThumbs: true,
						autostartThumbs: true,
						lightboxThumbsPosition: 'left',
						enableDownload: true,
						enableZoom: true,
						animationEffect: 'zoom',
						transitionEffect: 'crossfade',
						lightboxBackgroundColor: 'rgba(5,15,25,0.95)',
						lightboxInfobar: true,
					},
				},
			});
		}, album.id);
		expect(patched?.lightbox?.enableThumbs).toBe(true);
		expect(patched?.lightbox?.showImageCaption).toBe(true);
		expect(patched?.lightbox?.captionPosition).toBe('center');
		expect(patched?.lightbox?.lightboxThumbsPosition).toBe('left');
		expect(patched?.lightbox?.enableDownload).toBe(true);
		expect(patched?.lightbox?.enableZoom).toBe(true);
		expect(patched?.lightbox?.loopLightbox).toBe(true);
		// Unrelated Play / share / slideshow preserved.
		expect(patched?.lightbox?.enableShare).toBe(true);
		expect(patched?.lightbox?.lightboxFacebook).toBe(true);
		expect(patched?.lightbox?.enableSlideshow).toBe(true);
		expect(patched?.lightbox?.slideshowDuration).toBe(4500);
		expect(patched?.lightbox?.enablePlay).toBe(true);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.lightbox?.enableThumbs).toBe(true);
		expect(reopened?.lightbox?.showImageTitle).toBe(true);
		expect(reopened?.lightbox?.showImageCaption).toBe(true);
		expect(reopened?.lightbox?.captionPosition).toBe('center');
		expect(reopened?.lightbox?.lightboxThumbsPosition).toBe('left');
		expect(reopened?.lightbox?.animationEffect).toBe('zoom');
		expect(reopened?.lightbox?.transitionEffect).toBe('crossfade');
		expect(reopened?.lightbox?.lightboxBackgroundColor).toBe(
			'rgba(5,15,25,0.95)'
		);
		expect(reopened?.lightbox?.enableShare).toBe(true);
		expect(reopened?.lightbox?.lightboxFacebook).toBe(true);
		expect(reopened?.lightbox?.enableSlideshow).toBe(true);
		expect(reopened?.lightbox?.slideshowDuration).toBe(4500);
		expect(reopened?.lightbox?.enablePlay).toBe(true);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaLightbox
			);
			expect(response.ok()).toBe(true);

			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();

			const configRaw = await albumRoot.getAttribute('data-config');
			expect(configRaw).toBeTruthy();
			const config = JSON.parse(configRaw);
			expect(config.lightbox).toBe('fancybox');
			expect(config.lightbox_settings?.Carousel?.infinite).toBe(true);
			expect(config.lightbox_settings?.Thumbs?.showOnStart).toBe(true);
			expect(
				config.lightbox_settings?.Toolbar?.display?.right
			).toEqual(
				expect.arrayContaining([
					'thumbs',
					'download',
					'iterateZoom',
					'close',
				])
			);

			await albumRoot
				.locator(
					`.gallery-link[data-gallery-id="${album.imageGalleryId}"]`
				)
				.first()
				.click();

			const lightbox = publicPage.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			await expect(
				lightbox.locator(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				)
			).toBeVisible();
			// Albums hide arrows via generated CSS when enable_navigation is off.
			const hideNavCss = await publicPage.evaluate((albumId) => {
				const needle = `modula-lightbox-jtg-album-${albumId}`;
				return Array.from(document.querySelectorAll('style'))
					.map((el) => el.textContent || '')
					.some(
						(css) =>
							css.includes(needle) &&
							css.includes('is-arrow') &&
							css.includes('display:none')
					);
			}, album.id);
			expect(hideNavCss).toBe(false);
			await expect(
				lightbox
					.locator('.fancybox__caption')
					.filter({ hasText: album.captionHint })
					.first()
			).toBeVisible();
			await expect(
				lightbox.locator(
					'.fancybox__thumbs, [data-modula-thumbs-sidebar]'
				)
			).toBeVisible();
			await evidence.capture(publicPage, 'album-lightbox-images');

			const beforeSrc = await lightbox
				.locator('.fancybox__slide.is-selected img:not(.is-clone)')
				.getAttribute('src');
			await publicPage.keyboard.press('ArrowRight');
			await expect
				.poll(async () =>
					lightbox
						.locator(
							'.fancybox__slide.is-selected img:not(.is-clone)'
						)
						.getAttribute('src')
				)
				.not.toBe(beforeSrc);

			await publicPage.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);

			await albumRoot
				.locator(
					`.gallery-link[data-gallery-id="${album.videoGalleryId}"]`
				)
				.first()
				.click();
			await expect(lightbox).toBeVisible();
			await expect(lightbox.locator('video').first()).toBeVisible();
			await evidence.capture(publicPage, 'album-lightbox-video');
			await publicPage.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
		} finally {
			await evidence.closeVisitor(visitor);
		}

		await testInfo.attach('album-lightbox-patch.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					imageGalleryId: album.imageGalleryId,
					videoGalleryId: album.videoGalleryId,
					beforeThumbs: before?.lightbox?.enableThumbs,
					afterThumbs: reopened?.lightbox?.enableThumbs,
					preservedShare: reopened?.lightbox?.enableShare,
					preservedSlideshowDuration:
						reopened?.lightbox?.slideshowDuration,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
