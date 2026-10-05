const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums Image Guardian: protection / blur / URL toggles survive PATCH → reopen
 * and drive anonymous visitor scripts, Fancybox protected flag, and URL rewrite.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album Guardian settings journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album Guardian settings PATCH reopen public consumers', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaGuardian;
		expect(album?.id).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.protection?.protection).toBe(false);
		expect(before?.protection?.urlProtection).toBe(false);
		expect(before?.protection?.blurProtection).toBe(false);
		expect(before?.layout?.gutter).toBe(16);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					protection: {
						protection: true,
						urlProtection: true,
						blurProtection: true,
					},
					layout: { gutter: 16 },
				},
			});
		}, album.id);
		expect(patched?.protection?.protection).toBe(true);
		expect(patched?.protection?.urlProtection).toBe(true);
		expect(patched?.protection?.blurProtection).toBe(true);
		expect(patched?.layout?.gutter).toBe(16);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.protection?.protection).toBe(true);
		expect(reopened?.protection?.urlProtection).toBe(true);
		expect(reopened?.protection?.blurProtection).toBe(true);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaGuardian
			);
			expect(response.ok()).toBe(true);

			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();

			const scriptSrcs = await publicPage.evaluate(() =>
				Array.from(document.scripts).map((s) => s.src || '')
			);
			expect(
				scriptSrcs.some((src) =>
					/modula-albums-protection/i.test(src)
				)
			).toBe(true);
			expect(
				scriptSrcs.some((src) => /modula-blur-protection/i.test(src))
			).toBe(true);

			const config = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(config?.lightbox_settings?.Images?.protected).toBe(true);

			const coverHtml = await albumRoot.innerHTML();
			expect(coverHtml).toMatch(/\/modula-image\//);

			const styleHrefs = await publicPage.evaluate(() =>
				Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
					(l) => l.href || ''
				)
			);
			expect(
				styleHrefs.some((href) => /modula-protection\.css/i.test(href))
			).toBe(true);

			await evidence.capture(publicPage, 'album-guardian-on');

			// Distinct choice: URL protection alone (no right-click / blur scripts).
			await page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
					method: 'PATCH',
					data: {
						protection: {
							protection: false,
							urlProtection: true,
							blurProtection: false,
						},
					},
				});
			}, album.id);

			const urlOnlyResponse = await publicPage.goto(
				catalog.pages.albumBetaGuardian
			);
			expect(urlOnlyResponse.ok()).toBe(true);
			await expect(albumRoot).toBeVisible();

			const urlOnlyScripts = await publicPage.evaluate(() =>
				Array.from(document.scripts).map((s) => s.src || '')
			);
			expect(
				urlOnlyScripts.some((src) =>
					/modula-albums-protection/i.test(src)
				)
			).toBe(false);
			expect(
				urlOnlyScripts.some((src) =>
					/modula-blur-protection/i.test(src)
				)
			).toBe(false);

			const urlOnlyConfig = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(urlOnlyConfig?.lightbox_settings?.Images?.protected).toBe(
				false
			);
			expect(await albumRoot.innerHTML()).toMatch(/\/modula-image\//);

			await evidence.capture(publicPage, 'album-guardian-url-only');

			// Unrelated layout PATCH that omits protection must preserve values.
			await page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
					method: 'PATCH',
					data: {
						layout: { gutter: 18 },
					},
				});
			}, album.id);

			const afterOmit = await page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
				});
			}, album.id);
			expect(afterOmit?.layout?.gutter).toBe(18);
			expect(afterOmit?.protection?.protection).toBe(false);
			expect(afterOmit?.protection?.urlProtection).toBe(true);
			expect(afterOmit?.protection?.blurProtection).toBe(false);

			// Explicit disable: consumers must stop.
			await page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
					method: 'PATCH',
					data: {
						protection: {
							protection: false,
							urlProtection: false,
							blurProtection: false,
						},
					},
				});
			}, album.id);

			const offResponse = await publicPage.goto(
				catalog.pages.albumBetaGuardian
			);
			expect(offResponse.ok()).toBe(true);
			await expect(albumRoot).toBeVisible();

			const offScripts = await publicPage.evaluate(() =>
				Array.from(document.scripts).map((s) => s.src || '')
			);
			expect(
				offScripts.some((src) =>
					/modula-albums-protection/i.test(src)
				)
			).toBe(false);
			expect(
				offScripts.some((src) => /modula-blur-protection/i.test(src))
			).toBe(false);

			const offConfig = JSON.parse(
				await albumRoot.getAttribute('data-config')
			);
			expect(offConfig?.lightbox_settings?.Images?.protected).toBe(
				false
			);

			const offHtml = await albumRoot.innerHTML();
			expect(offHtml).not.toMatch(/\/modula-image\//);

			await evidence.capture(publicPage, 'album-guardian-off');
		} finally {
			await visitor.close();
		}

		await testInfo.attach('album-guardian-settings.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					page: catalog.pages.albumBetaGuardian,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
