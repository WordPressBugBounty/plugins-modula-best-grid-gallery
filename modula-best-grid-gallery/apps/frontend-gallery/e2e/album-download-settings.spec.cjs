const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums Download extension: REST PATCH → reopen → anonymous chrome +
 * authorized ZIP download. Distinct from lightbox.enableDownload toolbar switch.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album download settings journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album download settings PATCH reopen public chrome and zip', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaDownload;
		expect(album?.id).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.download?.enableDownload).toBe(false);
		expect(before?.lightbox?.enableDownload).toBe(true);
		expect(before?.layout?.gutter).toBe(16);

		const patched = await page.evaluate(
			async ({ albumId, label }) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
					method: 'PATCH',
					data: {
						download: {
							enableDownload: true,
							downloadGalleryButton: true,
							downloadGalleryButtonColor: '#ff3366',
							downloadGalleryButtonPosition: 'top_right',
							downloadAllLightboxButton: true,
							downloadAllGalleryButton: true,
							downloadImageSizes: 'medium',
							downloadAllLabel: label,
							downloadAllPosition: 'above_below_gallery',
							downloadAllHposition: 'right',
							downloadAllGalleryButtonIcon: true,
							downloadAllGalleryIconColor: '#2244aa',
							customZipName: '%%album_title%%',
						},
						// Unrelated Lightbox toolbar switch + layout must survive.
						lightbox: { enableDownload: true },
						layout: { gutter: 16 },
					},
				});
			},
			{ albumId: album.id, label: album.label }
		);
		expect(patched?.download?.enableDownload).toBe(true);
		expect(patched?.download?.downloadGalleryButtonColor).toBe('#ff3366');
		expect(patched?.download?.downloadGalleryButtonPosition).toBe(
			'top_right'
		);
		expect(patched?.download?.downloadAllLightboxButton).toBe(true);
		expect(patched?.download?.downloadImageSizes).toBe('medium');
		expect(patched?.download?.downloadAllLabel).toBe(album.label);
		expect(patched?.download?.downloadAllPosition).toBe(
			'above_below_gallery'
		);
		expect(patched?.download?.downloadAllHposition).toBe('right');
		expect(patched?.download?.downloadAllGalleryIconColor).toBe('#2244aa');
		expect(patched?.lightbox?.enableDownload).toBe(true);
		expect(patched?.layout?.gutter).toBe(16);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.download?.enableDownload).toBe(true);
		expect(reopened?.download?.downloadAllLabel).toBe(album.label);
		expect(reopened?.download?.downloadImageSizes).toBe('medium');
		expect(reopened?.download?.downloadAllLightboxButton).toBe(true);
		expect(reopened?.download?.customZipName).toBe('%%album_title%%');
		expect(reopened?.lightbox?.enableDownload).toBe(true);
		expect(reopened?.layout?.gutter).toBe(16);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaDownload
			);
			expect(response.ok()).toBe(true);

			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();

			const downloadAll = publicPage
				.locator('.modula-download-all-button .modula-download-all')
				.first();
			await expect(downloadAll).toBeVisible();
			await expect(downloadAll).toContainText(album.label);
			await expect(downloadAll.locator('svg').first()).toBeVisible();

			const css = (
				await publicPage.locator('style').allTextContents()
			).join('\n');
			const root = `#jtg-album-${album.id}`;
			expect(css).toContain(
				`${root} .modula-download-all-button { text-align: right }`
			);
			expect(css).toContain(
				`${root} .modula-item a.modula-download-button { top:25px; right:25px;`
			);
			expect(css).toContain('#ff3366');
			expect(css).toContain('fill : #2244aa');

			await expect(
				albumRoot.locator('a.modula-download-button').first()
			).toBeVisible();

			// Lightbox Download All is wired into album Fancybox toolbar config.
			const configRaw = await albumRoot.getAttribute('data-config');
			expect(configRaw).toBeTruthy();
			const config = JSON.parse(configRaw);
			expect(
				config.lightbox_settings?.Toolbar?.display?.right
			).toEqual(expect.arrayContaining(['downloadAll']));
			expect(
				config.lightbox_settings?.Toolbar?.items?.downloadAll?.tpl
			).toMatch(/download-all/);

			await evidence.capture(publicPage, 'album-download-chrome');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		// Authorized ZIP: use an unobserved context so evidence response.sizes()
		// does not hang on the attachment download transfer.
		const bare = await page.context().browser().newContext({
			storageState: { cookies: [], origins: [] },
		});
		try {
			const barePage = await bare.newPage();
			const bareResponse = await barePage.goto(
				catalog.pages.albumBetaDownload
			);
			expect(bareResponse.ok()).toBe(true);
			const bareDownload = barePage
				.locator('.modula-download-all-button .modula-download-all')
				.first();
			await expect(bareDownload).toBeVisible();
			const pending = barePage.waitForEvent('download');
			await bareDownload.click();
			const zipDownload = await pending;
			expect(await zipDownload.failure()).toBeNull();
			const zipPath = testInfo.outputPath('album-download.zip');
			await zipDownload.saveAs(zipPath);
			expect(fs.statSync(zipPath).size).toBeGreaterThan(100);
			const zipHeader = Buffer.alloc(2);
			const fd = fs.openSync(zipPath, 'r');
			fs.readSync(fd, zipHeader, 0, 2, 0);
			fs.closeSync(fd);
			expect(zipHeader.toString('binary')).toBe('PK');
		} finally {
			await bare.close();
		}

		await testInfo.attach('album-download-summary', {
			body: JSON.stringify(
				{
					albumId: album.id,
					label: album.label,
					downloadImageSizes: 'medium',
					lightboxEnableDownloadPreserved: true,
					layoutGutterPreserved: true,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
