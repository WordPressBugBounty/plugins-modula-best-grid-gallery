const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums Lightbox Play, slideshow timing, and sharing: REST PATCH → reopen →
 * anonymous data-config (Play toolbar, playOnStart, duration, modulaShare).
 * Network choices survive when share is switched off.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album lightbox slideshow/share journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album lightbox play slideshow and share PATCH reopen public config', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaLightbox;
		expect(album?.id).toBeTruthy();
		expect(album?.imageGalleryId).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.lightbox?.enableLightbox).toBe(true);
		expect(before?.lightbox?.enablePlay).toBe(true);
		expect(before?.lightbox?.enableSlideshow).toBe(true);
		expect(before?.lightbox?.slideshowDuration).toBe(4500);
		expect(before?.lightbox?.enableShare).toBe(true);
		expect(before?.lightbox?.lightboxFacebook).toBe(true);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					lightbox: {
						enableLightbox: true,
						lightboxToolbar: true,
						enablePlay: true,
						enableSlideshow: true,
						slideshowDuration: 2800,
						enableShare: true,
						lightboxFacebook: true,
						lightboxTwitter: true,
						lightboxWhatsapp: false,
						lightboxLinkedin: true,
						lightboxPinterest: false,
						lightboxEmail: true,
						lightboxEmailSubject: 'E2E album share subject',
						lightboxEmailMessage:
							'E2E album share body %%image_link%%',
						// Unrelated core field must survive with Play/share edits.
						enableThumbs: true,
						showImageCaption: true,
					},
				},
			});
		}, album.id);
		expect(patched?.lightbox?.enablePlay).toBe(true);
		expect(patched?.lightbox?.enableSlideshow).toBe(true);
		expect(patched?.lightbox?.slideshowDuration).toBe(2800);
		expect(patched?.lightbox?.lightboxTwitter).toBe(true);
		expect(patched?.lightbox?.lightboxLinkedin).toBe(true);
		expect(patched?.lightbox?.lightboxEmail).toBe(true);
		expect(patched?.lightbox?.lightboxEmailSubject).toBe(
			'E2E album share subject'
		);
		expect(patched?.lightbox?.enableThumbs).toBe(true);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.lightbox?.enablePlay).toBe(true);
		expect(reopened?.lightbox?.slideshowDuration).toBe(2800);
		expect(reopened?.lightbox?.lightboxTwitter).toBe(true);
		expect(reopened?.lightbox?.lightboxLinkedin).toBe(true);
		expect(reopened?.lightbox?.lightboxEmailMessage).toBe(
			'E2E album share body %%image_link%%'
		);

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

			const config = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(
				config.lightbox_settings?.Toolbar?.display?.right
			).toEqual(expect.arrayContaining(['slideshow', 'share', 'thumbs']));
			expect(config.lightbox_settings?.Slideshow?.playOnStart).toBe(true);
			expect(config.lightbox_settings?.Slideshow?.timeout).toBe(2800);
			expect(config.lightbox_settings?.modulaShare).toEqual(
				expect.arrayContaining([
					'facebook',
					'twitter',
					'linkedin',
					'email',
				])
			);
			expect(config.lightbox_settings?.modulaShare).not.toEqual(
				expect.arrayContaining(['whatsapp', 'pinterest'])
			);
			expect(config.lightbox_settings?.lightboxEmailSubject).toBe(
				'E2E album share subject'
			);
			expect(config.lightbox_settings?.lightboxEmailMessage).toBe(
				'E2E album share body %%image_link%%'
			);

			await albumRoot
				.locator(
					`.gallery-link[data-gallery-id="${album.imageGalleryId}"]`
				)
				.first()
				.click();
			const lightbox = publicPage.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			const hasSlideshowBtn = await publicPage.evaluate(() => {
				const root = document.querySelector(
					'.modula-fancybox-container'
				);
				if (!root) {
					return false;
				}
				if (
					root.querySelector(
						'[data-fancybox-slideshow], [data-fancybox-play], button.f-button[aria-label*="slideshow" i], button.f-button[aria-label*="Start" i]'
					)
				) {
					return true;
				}
				return Array.from(root.querySelectorAll('button.f-button')).some(
					(btn) =>
						/slideshow|play|pause/i.test(
							btn.getAttribute('aria-label') ||
								btn.getAttribute('title') ||
								''
						)
				);
			});
			expect(hasSlideshowBtn).toBe(true);
			await evidence.capture(publicPage, 'album-lightbox-play-share');
			await publicPage.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
		} finally {
			await evidence.closeVisitor(visitor);
		}

		// Switching share/slideshow off must retain Play and network/email values.
		const toggledOff = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					lightbox: {
						enableShare: false,
						enableSlideshow: false,
					},
				},
			});
		}, album.id);
		expect(toggledOff?.lightbox?.enableShare).toBe(false);
		expect(toggledOff?.lightbox?.enableSlideshow).toBe(false);
		expect(toggledOff?.lightbox?.enablePlay).toBe(true);
		expect(toggledOff?.lightbox?.slideshowDuration).toBe(2800);
		expect(toggledOff?.lightbox?.lightboxTwitter).toBe(true);
		expect(toggledOff?.lightbox?.lightboxEmailSubject).toBe(
			'E2E album share subject'
		);

		const afterOff = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(afterOff?.lightbox?.enablePlay).toBe(true);
		expect(afterOff?.lightbox?.slideshowDuration).toBe(2800);
		expect(afterOff?.lightbox?.lightboxLinkedin).toBe(true);
		expect(afterOff?.lightbox?.lightboxEmail).toBe(true);

		const visitorOff = await evidence.anonymous();
		try {
			const publicPage = await visitorOff.newPage();
			await publicPage.goto(catalog.pages.albumBetaLightbox);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			const config = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(
				config.lightbox_settings?.Toolbar?.display?.right
			).toEqual(expect.arrayContaining(['slideshow']));
			expect(
				config.lightbox_settings?.Toolbar?.display?.right || []
			).not.toContain('share');
			expect(config.lightbox_settings?.Slideshow?.playOnStart).not.toBe(
				true
			);
			expect(config.lightbox_settings?.modulaShare || []).toHaveLength(0);
		} finally {
			await evidence.closeVisitor(visitorOff);
		}

		// Re-enable share/slideshow: preserved network choices return publicly.
		const restored = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					lightbox: {
						enableShare: true,
						enableSlideshow: true,
					},
				},
			});
		}, album.id);
		expect(restored?.lightbox?.enableShare).toBe(true);
		expect(restored?.lightbox?.enableSlideshow).toBe(true);
		expect(restored?.lightbox?.lightboxTwitter).toBe(true);
		expect(restored?.lightbox?.slideshowDuration).toBe(2800);

		const visitorRestored = await evidence.anonymous();
		try {
			const publicPage = await visitorRestored.newPage();
			await publicPage.goto(catalog.pages.albumBetaLightbox);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			const config = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(config.lightbox_settings?.Slideshow?.playOnStart).toBe(true);
			expect(config.lightbox_settings?.Slideshow?.timeout).toBe(2800);
			expect(config.lightbox_settings?.modulaShare).toEqual(
				expect.arrayContaining([
					'facebook',
					'twitter',
					'linkedin',
					'email',
				])
			);
		} finally {
			await evidence.closeVisitor(visitorRestored);
		}

		// Play off removes the toolbar control; autoplay flag alone does not restore it.
		const playOff = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					lightbox: {
						enablePlay: false,
						enableSlideshow: true,
					},
				},
			});
		}, album.id);
		expect(playOff?.lightbox?.enablePlay).toBe(false);
		expect(playOff?.lightbox?.enableSlideshow).toBe(true);

		const visitorPlayOff = await evidence.anonymous();
		try {
			const publicPage = await visitorPlayOff.newPage();
			await publicPage.goto(catalog.pages.albumBetaLightbox);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			const config = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(
				config.lightbox_settings?.Toolbar?.display?.right || []
			).not.toContain('slideshow');
			expect(config.lightbox_settings?.Slideshow?.playOnStart).toBe(true);
			expect(config.lightbox_settings?.Slideshow?.timeout).toBe(2800);
		} finally {
			await evidence.closeVisitor(visitorPlayOff);
		}

		await testInfo.attach('album-lightbox-play-share.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					beforePlay: before?.lightbox?.enablePlay,
					afterDuration: reopened?.lightbox?.slideshowDuration,
					preservedAfterShareOff:
						afterOff?.lightbox?.lightboxTwitter,
					playOffToolbarLacksSlideshow: true,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
