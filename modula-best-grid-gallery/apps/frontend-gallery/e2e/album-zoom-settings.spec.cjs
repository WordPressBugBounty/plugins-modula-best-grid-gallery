const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums Zoom extension: REST PATCH → reopen → anonymous Lightbox mzoom.
 * Distinct from lightbox.enableZoom toolbar switch.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album zoom settings journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album zoom settings PATCH reopen public mzoom', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaZoom;
		expect(album?.id).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.zoom?.enableZoom).toBe(false);
		expect(before?.lightbox?.enableZoom).toBe(true);
		expect(before?.layout?.gutter).toBe(16);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					zoom: {
						enableZoom: true,
						zoomOnHover: false,
						zoomType: 'window',
						zoomEffect: 'fade_in_out',
						zoomWindowPosition: 'lower_right',
						zoomWindowSize: 'large',
						zoomLensShape: 'square',
						zoomTintColor: '#336699',
						zoomTintOpacity: 40,
						// Stored for when mode switches to lens; must survive.
						zoomLensSize: 'xlarge',
					},
					// Unrelated Lightbox toolbar switch + layout must survive.
					lightbox: { enableZoom: true },
					layout: { gutter: 16 },
				},
			});
		}, album.id);
		expect(patched?.zoom?.enableZoom).toBe(true);
		expect(patched?.zoom?.zoomOnHover).toBe(false);
		expect(patched?.zoom?.zoomType).toBe('window');
		expect(patched?.zoom?.zoomEffect).toBe('fade_in_out');
		expect(patched?.zoom?.zoomWindowPosition).toBe('lower_right');
		expect(patched?.zoom?.zoomWindowSize).toBe('large');
		expect(patched?.zoom?.zoomLensShape).toBe('square');
		expect(patched?.zoom?.zoomTintColor).toBe('#336699');
		expect(patched?.zoom?.zoomTintOpacity).toBe(40);
		expect(patched?.zoom?.zoomLensSize).toBe('xlarge');
		expect(patched?.lightbox?.enableZoom).toBe(true);
		expect(patched?.layout?.gutter).toBe(16);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.zoom?.enableZoom).toBe(true);
		expect(reopened?.zoom?.zoomOnHover).toBe(false);
		expect(reopened?.zoom?.zoomType).toBe('window');
		expect(reopened?.zoom?.zoomWindowSize).toBe('large');
		expect(reopened?.zoom?.zoomTintColor).toBe('#336699');
		expect(reopened?.zoom?.zoomLensSize).toBe('xlarge');
		expect(reopened?.lightbox?.enableZoom).toBe(true);
		expect(reopened?.layout?.gutter).toBe(16);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(catalog.pages.albumBetaZoom);
			expect(response.ok()).toBe(true);

			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();

			const css = (
				await publicPage.locator('style').allTextContents()
			).join('\n');
			expect(css).toContain('.zoomContainer');
			const elevateSrc = await publicPage.evaluate(() => {
				const scripts = Array.from(document.scripts).map((s) => s.src);
				return scripts.find((src) => /elevatezoom/i.test(src)) || '';
			});
			expect(elevateSrc).toMatch(/elevatezoom/i);

			const configRaw = await albumRoot.getAttribute('data-config');
			expect(configRaw).toBeTruthy();
			const config = JSON.parse(configRaw);
			const mzoom = config.lightbox_settings?.mzoom;
			expect(mzoom).toBeTruthy();
			expect(mzoom.zoomType).toBe('window');
			expect(mzoom.zoomOnHover).toBe(false);
			// elevateZoom window position map: lower_right → 3
			expect(mzoom.zoomWindowPosition).toBe(3);
			// elevateZoom size map: large → 300
			expect(mzoom.zoomWindowWidth).toBe(300);
			expect(mzoom.zoomWindowHeight).toBe(300);
			expect(mzoom.lensShape).toBe('square');
			expect(mzoom.tintColour).toBe('#336699');
			expect(mzoom.tintOpacity).toBeCloseTo(0.4);
			expect(mzoom.zoomWindowFadeIn).toBe(650);
			expect(mzoom.zoomWindowFadeOut).toBe(650);
			expect(
				config.lightbox_settings?.Toolbar?.display?.right
			).toEqual(expect.arrayContaining(['elevateZoom']));
			expect(
				config.lightbox_settings?.Toolbar?.items?.elevateZoom?.tpl
			).toMatch(/elevatezoom-button/);

			await evidence.capture(publicPage, 'album-zoom-window');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		// Inner mode: only type/on-hover reach the visitor config.
		const innerPatched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					zoom: {
						enableZoom: true,
						zoomOnHover: true,
						zoomType: 'inner',
						zoomWindowSize: 'large',
						zoomTintColor: '#336699',
					},
					lightbox: { enableZoom: true },
					layout: { gutter: 16 },
				},
			});
		}, album.id);
		expect(innerPatched?.zoom?.zoomType).toBe('inner');
		expect(innerPatched?.zoom?.zoomWindowSize).toBe('large');

		const innerVisitor = await evidence.anonymous();
		try {
			const publicPage = await innerVisitor.newPage();
			const response = await publicPage.goto(catalog.pages.albumBetaZoom);
			expect(response.ok()).toBe(true);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();
			const config = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(config.lightbox_settings?.mzoom?.zoomType).toBe('inner');
			expect(config.lightbox_settings?.mzoom?.zoomOnHover).toBe(true);
			await evidence.capture(publicPage, 'album-zoom-inner');
		} finally {
			await evidence.closeVisitor(innerVisitor);
		}

		// Switch to lens; preserved lens size must appear in public mzoom.
		const lensPatched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					zoom: {
						enableZoom: true,
						zoomOnHover: true,
						zoomType: 'lens',
						zoomEffect: 'easing',
						zoomLensSize: 'xlarge',
						zoomLensShape: 'round',
						// Window/tint values must survive mode switch.
						zoomWindowSize: 'large',
						zoomTintColor: '#336699',
						zoomTintOpacity: 40,
					},
					lightbox: { enableZoom: true },
					layout: { gutter: 16 },
				},
			});
		}, album.id);
		expect(lensPatched?.zoom?.zoomType).toBe('lens');
		expect(lensPatched?.zoom?.zoomLensSize).toBe('xlarge');
		expect(lensPatched?.zoom?.zoomWindowSize).toBe('large');
		expect(lensPatched?.zoom?.zoomTintColor).toBe('#336699');
		expect(lensPatched?.lightbox?.enableZoom).toBe(true);

		const lensVisitor = await evidence.anonymous();
		try {
			const publicPage = await lensVisitor.newPage();
			const response = await publicPage.goto(catalog.pages.albumBetaZoom);
			expect(response.ok()).toBe(true);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();
			const config = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			const mzoom = config.lightbox_settings?.mzoom;
			expect(mzoom.zoomType).toBe('lens');
			expect(mzoom.zoomOnHover).toBe(true);
			expect(mzoom.lensSize).toBe(350); // xlarge
			expect(mzoom.lensShape).toBe('round');
			expect(mzoom.easing).toBe(true);
			expect(mzoom.tint).toBe(false);
			const toolbarRight =
				config.lightbox_settings?.Toolbar?.display?.right || [];
			expect(toolbarRight).not.toEqual(
				expect.arrayContaining(['elevateZoom'])
			);
			await evidence.capture(publicPage, 'album-zoom-lens');
		} finally {
			await evidence.closeVisitor(lensVisitor);
		}

		await testInfo.attach('album-zoom-summary', {
			body: JSON.stringify(
				{
					albumId: album.id,
					windowThenLens: true,
					lightboxEnableZoomPreserved: true,
					layoutGutterPreserved: true,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
