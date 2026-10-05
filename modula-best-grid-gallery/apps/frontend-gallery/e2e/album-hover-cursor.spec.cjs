const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums hover + custom cursor: REST PATCH → reopen → anonymous markup/CSS.
 * Effect class, hover colors/opacity/padding, image-count, custom cursor URL.
 * Switching cursor mode preserves uploadCursor. Unrelated captions/layout survive.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album hover cursor journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album hover cursor PATCH reopen public styles', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaHover;
		expect(album?.id).toBeTruthy();
		expect(album?.cursorAttachment).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.hover?.effect).toBe('under');
		expect(before?.hover?.cursor).toBe('pointer');
		expect(before?.hover?.displayImageCount).toBe(false);
		expect(before?.hover?.hoverColor).toBe('#112233');
		expect(before?.hover?.hoverPadding).toBe(8);
		expect(before?.captions?.titleColor).toBe('#aabbcc');
		expect(before?.layout?.gutter).toBe(14);

		const patched = await page.evaluate(
			async ({ albumId, cursorAttachment }) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
					method: 'PATCH',
					data: {
						hover: {
							effect: 'lily',
							cursor: 'custom',
							uploadCursor: cursorAttachment,
							displayImageCount: true,
							imageCountColor: '#ff6600',
							imageCountFontSize: 18,
							hoverColor: '#aa1122',
							backgroundColor: '#2266bb',
							hoverOpacity: 70,
							hoverPadding: 20,
						},
						// Unrelated captions + layout must survive.
						captions: { titleColor: '#aabbcc' },
						layout: { gutter: 14 },
					},
				});
			},
			{ albumId: album.id, cursorAttachment: album.cursorAttachment }
		);
		expect(patched?.hover?.effect).toBe('lily');
		expect(patched?.hover?.cursor).toBe('custom');
		expect(Number(patched?.hover?.uploadCursor)).toBe(
			Number(album.cursorAttachment)
		);
		expect(patched?.hover?.displayImageCount).toBe(true);
		expect(patched?.hover?.imageCountColor).toBe('#ff6600');
		expect(patched?.hover?.imageCountFontSize).toBe(18);
		expect(patched?.hover?.hoverColor).toBe('#aa1122');
		expect(patched?.hover?.backgroundColor).toBe('#2266bb');
		expect(patched?.hover?.hoverOpacity).toBe(70);
		expect(patched?.hover?.hoverPadding).toBe(20);
		expect(patched?.captions?.titleColor).toBe('#aabbcc');
		expect(patched?.layout?.gutter).toBe(14);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.hover?.effect).toBe('lily');
		expect(reopened?.hover?.cursor).toBe('custom');
		expect(Number(reopened?.hover?.uploadCursor)).toBe(
			Number(album.cursorAttachment)
		);
		expect(reopened?.hover?.displayImageCount).toBe(true);
		expect(reopened?.hover?.imageCountColor).toBe('#ff6600');
		expect(reopened?.hover?.hoverOpacity).toBe(70);
		expect(reopened?.captions?.titleColor).toBe('#aabbcc');
		expect(reopened?.layout?.gutter).toBe(14);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaHover
			);
			expect(response.ok()).toBe(true);

			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();
			await expect(
				albumRoot.locator('.modula-item.effect-lily').first()
			).toBeVisible();
			await expect(albumRoot.locator('.image_count').first()).toBeVisible();

			const css = (
				await publicPage.locator('style').allTextContents()
			).join('\n');
			const root = `#jtg-album-${album.id}`;
			expect(css).toContain(
				`${root}.modula-album .modula-items .modula-item{ background-color: #aa1122; }`
			);
			expect(css).toContain('opacity:0.7');
			expect(css).toContain('padding:20px');
			expect(css).toContain('color:#ff6600;');
			expect(css).toContain('font-size:18px');
			expect(css).toMatch(/cursor:url\([^)]+\),auto/);

			await evidence.capture(publicPage, 'album-hover-custom-cursor');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		// Switching away from Custom preserves uploadCursor.
		const switched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					hover: {
						cursor: 'zoom-in',
					},
				},
			});
		}, album.id);
		expect(switched?.hover?.cursor).toBe('zoom-in');
		expect(Number(switched?.hover?.uploadCursor)).toBe(
			Number(album.cursorAttachment)
		);
		expect(switched?.hover?.effect).toBe('lily');

		const switchedReopen = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(switchedReopen?.hover?.cursor).toBe('zoom-in');
		expect(Number(switchedReopen?.hover?.uploadCursor)).toBe(
			Number(album.cursorAttachment)
		);
		expect(switchedReopen?.captions?.titleColor).toBe('#aabbcc');

		const visitorZoom = await evidence.anonymous();
		try {
			const publicPage = await visitorZoom.newPage();
			const response = await publicPage.goto(
				`${catalog.pages.albumBetaHover}?modula_e2e=${Date.now()}`
			);
			expect(response.ok()).toBe(true);
			const css = (
				await publicPage.locator('style').allTextContents()
			).join('\n');
			expect(css).toContain('cursor:zoom-in;');
			await evidence.capture(publicPage, 'album-hover-zoom-cursor');
		} finally {
			await evidence.closeVisitor(visitorZoom);
		}

		await testInfo.attach('album-hover-summary', {
			body: JSON.stringify(
				{
					albumId: album.id,
					effect: 'lily',
					cursorAttachment: album.cursorAttachment,
					uploadCursorPreserved: true,
					captionsPreserved: true,
					layoutGutterPreserved: true,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
