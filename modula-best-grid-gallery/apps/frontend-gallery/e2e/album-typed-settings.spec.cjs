const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums editor must round-trip a one-pixel gutter and lazy-load ON through
 * settings PATCH → reopen → anonymous visitor. Classic consumers require
 * lazy_load as the string '1'; CLI covers broader typed conversion cases.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album typed settings journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album gutter=1 and lazy-load survive PATCH and public render', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaTyped;
		expect(album?.id).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.layout?.gutter).toBe(20);
		expect(before?.performance?.lazyLoad).toBe(false);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					layout: { gutter: 1 },
					performance: { lazyLoad: true },
				},
			});
		}, album.id);
		expect(patched?.layout?.gutter).toBe(1);
		expect(patched?.performance?.lazyLoad).toBe(true);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.layout?.gutter).toBe(1);
		expect(reopened?.performance?.lazyLoad).toBe(true);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaTyped
			);
			expect(response.ok()).toBe(true);

			const albumRoot = publicPage.locator(`#jtg-album-${album.id}`);
			await expect(albumRoot).toBeVisible();

			const configRaw = await albumRoot.getAttribute('data-config');
			expect(configRaw).toBeTruthy();
			const config = JSON.parse(configRaw);
			expect(config.gutter).toBe(1);
			// Classic album JS compares with == '1'; a boolean true would fail.
			expect(config.lazyLoad).toBe('1');

			// The loader removes .lazyload after decoding; inspect the server
			// markup separately from the final, successfully loaded image.
			const initialLazyImages = await publicPage.evaluate(
				({ html, id }) =>
					new DOMParser()
						.parseFromString(html, 'text/html')
						.querySelectorAll(
							`#jtg-album-${id} img.lazyload[data-source="modula-album"]`
						).length,
				{ html: await response.text(), id: album.id }
			);
			expect(initialLazyImages).toBeGreaterThan(0);
			const cover = albumRoot
				.locator('img[data-source="modula-album"]')
				.first();
			await expect(cover).toHaveClass(/(?:^|\s)lazyloaded(?:\s|$)/);
			await expect
				.poll(() =>
					cover.evaluate(
						(img) => img.complete && img.naturalWidth > 0
					)
				)
				.toBe(true);

			await evidence.capture(publicPage, 'album-beta-typed-visitor');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		await testInfo.attach('album-typed-roundtrip.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					beforeGutter: before?.layout?.gutter,
					beforeLazyLoad: before?.performance?.lazyLoad,
					afterGutter: reopened?.layout?.gutter,
					afterLazyLoad: reopened?.performance?.lazyLoad,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
