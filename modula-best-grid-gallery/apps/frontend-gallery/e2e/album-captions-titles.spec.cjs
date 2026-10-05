const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums tile titles/captions: REST PATCH → reopen → anonymous markup/CSS
 * (desktop + mobile sizes). Distinct from Lightbox captions. Member caption text
 * and unrelated layout/Lightbox caption settings survive.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album captions titles journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album captions titles PATCH reopen public tile styles', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaCaptions;
		expect(album?.id).toBeTruthy();
		expect(album?.tileTitle).toBeTruthy();
		expect(album?.tileCaption).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const beforeMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		const member = (beforeMembers?.members || []).find(
			(row) => row.id === album.galleryId
		);
		expect(member?.caption).toBe(album.tileCaption);
		expect(member?.title).toBe(album.tileTitle);

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.captions?.hideTitle).toBe(false);
		expect(before?.captions?.titleColor).toBe('#112233');
		expect(before?.captions?.titleFontSize).toBe(18);
		expect(before?.captions?.mobileTitleFontSize).toBe(11);
		expect(before?.captions?.captionColor).toBe('#445566');
		expect(before?.lightbox?.showImageTitle).toBe(true);
		expect(before?.lightbox?.showImageCaption).toBe(false);
		expect(before?.lightbox?.captionPosition).toBe('right');
		expect(before?.layout?.gutter).toBe(12);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					captions: {
						hideTitle: false,
						hideDescription: false,
						titleColor: '#aa1122',
						titleFontSize: 22,
						mobileTitleFontSize: 13,
						captionColor: '#2266bb',
						captionFontSize: 17,
						mobileCaptionFontSize: 10,
					},
					// Unrelated layout + Lightbox caption must survive.
					layout: { gutter: 12 },
					lightbox: {
						showImageTitle: true,
						showImageCaption: false,
						captionPosition: 'right',
					},
				},
			});
		}, album.id);
		expect(patched?.captions?.titleColor).toBe('#aa1122');
		expect(patched?.captions?.titleFontSize).toBe(22);
		expect(patched?.captions?.mobileTitleFontSize).toBe(13);
		expect(patched?.captions?.captionColor).toBe('#2266bb');
		expect(patched?.captions?.captionFontSize).toBe(17);
		expect(patched?.captions?.mobileCaptionFontSize).toBe(10);
		expect(patched?.lightbox?.showImageCaption).toBe(false);
		expect(patched?.lightbox?.captionPosition).toBe('right');
		expect(patched?.layout?.gutter).toBe(12);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.captions?.titleColor).toBe('#aa1122');
		expect(reopened?.captions?.titleFontSize).toBe(22);
		expect(reopened?.captions?.mobileTitleFontSize).toBe(13);
		expect(reopened?.captions?.captionColor).toBe('#2266bb');
		expect(reopened?.captions?.captionFontSize).toBe(17);
		expect(reopened?.captions?.mobileCaptionFontSize).toBe(10);
		expect(reopened?.lightbox?.showImageTitle).toBe(true);
		expect(reopened?.lightbox?.showImageCaption).toBe(false);
		expect(reopened?.lightbox?.captionPosition).toBe('right');
		expect(reopened?.layout?.gutter).toBe(12);

		const membersAfter = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		const memberAfter = (membersAfter?.members || []).find(
			(row) => row.id === album.galleryId
		);
		expect(memberAfter?.caption).toBe(album.tileCaption);
		expect(memberAfter?.title).toBe(album.tileTitle);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.setViewportSize({ width: 1280, height: 800 });
			const response = await publicPage.goto(
				catalog.pages.albumBetaCaptions
			);
			expect(response.ok()).toBe(true);

			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();

			const title = albumRoot.locator('.jtg-title').first();
			await expect(title).toContainText(album.tileTitle);
			const caption = albumRoot.locator('.jtg-description').first();
			await expect(caption).toContainText(album.tileCaption);

			const css = (await publicPage.locator('style').allTextContents()).join(
				'\n'
			);
			const root = `#jtg-album-${album.id}`;
			expect(css).toContain(
				`${root} .modula-items .figc .jtg-title {`
			);
			expect(css).toContain('color:#aa1122;');
			expect(css).toContain('font-size:22px;');
			expect(css).toContain('color:#2266bb;');
			expect(css).toContain('font-size:17px;');
			expect(css).toContain('@media screen and (max-width:480px)');
			expect(css).toContain(
				`${root} .modula-item .figc .jtg-title {  font-size: 13px; }`
			);
			expect(css).toContain('font-size:10px;');

			const desktopTitleSize = await title.evaluate((el) =>
				getComputedStyle(el).fontSize
			);
			expect(desktopTitleSize).toBe('22px');
			const desktopTitleColor = await title.evaluate((el) =>
				getComputedStyle(el).color
			);
			expect(desktopTitleColor).toBe('rgb(170, 17, 34)');
			const desktopCaptionSize = await caption.evaluate((el) =>
				getComputedStyle(el).fontSize
			);
			expect(desktopCaptionSize).toBe('17px');
			const desktopCaptionColor = await caption.evaluate((el) =>
				getComputedStyle(el).color
			);
			expect(desktopCaptionColor).toBe('rgb(34, 102, 187)');

			await publicPage.setViewportSize({ width: 390, height: 844 });
			const mobileTitleSize = await title.evaluate((el) =>
				getComputedStyle(el).fontSize
			);
			expect(mobileTitleSize).toBe('13px');
			const mobileCaptionSize = await caption.evaluate((el) =>
				getComputedStyle(el).fontSize
			);
			expect(mobileCaptionSize).toBe('10px');

			await evidence.capture(publicPage, 'album-captions-visible');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		const hidden = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					captions: {
						hideTitle: true,
						hideDescription: true,
						titleColor: '#aa1122',
						captionColor: '#2266bb',
					},
				},
			});
		}, album.id);
		expect(hidden?.captions?.hideTitle).toBe(true);
		expect(hidden?.captions?.hideDescription).toBe(true);

		const hiddenReopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(hiddenReopened?.captions?.hideTitle).toBe(true);
		expect(hiddenReopened?.captions?.hideDescription).toBe(true);
		expect(hiddenReopened?.captions?.titleColor).toBe('#aa1122');
		expect(hiddenReopened?.lightbox?.captionPosition).toBe('right');

		const visitorHidden = await evidence.anonymous();
		try {
			const publicPage = await visitorHidden.newPage();
			const response = await publicPage.goto(
				`${catalog.pages.albumBetaCaptions}?modula_e2e=${Date.now()}`
			);
			expect(response.ok()).toBe(true);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible();
			await expect(albumRoot.locator('.jtg-title')).toHaveCount(0);
			await expect(albumRoot.locator('.jtg-description')).toHaveCount(0);
			await evidence.capture(publicPage, 'album-captions-hidden');
		} finally {
			await evidence.closeVisitor(visitorHidden);
		}

		await testInfo.attach('album-captions-summary', {
			body: JSON.stringify(
				{
					albumId: album.id,
					titleColor: '#aa1122',
					titleFontSize: 22,
					mobileTitleFontSize: 13,
					memberCaptionPreserved: album.tileCaption,
					lightboxCaptionDistinct: true,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
