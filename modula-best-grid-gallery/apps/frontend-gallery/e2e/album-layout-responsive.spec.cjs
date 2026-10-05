const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Album layout settings survive PATCH and drive public CSS plus nested navigation.
 * Desktop, tablet, and mobile values stay distinct. Custom width is emitted only
 * for the custom width mode.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album layout responsive journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album layout PATCH reopens into distinct public CSS and nested navigation', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaLayout;
		expect(album?.id).toBeTruthy();
		expect(album?.childId).toBeTruthy();
		expect(album?.childA).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const beforeMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		const spans = Object.fromEntries(
			(beforeMembers?.members || []).map((row) => [
				row.id,
				{ width: row.width, height: row.height },
			])
		);
		expect(spans[album.childA]).toEqual({ width: 1, height: 1 });
		expect(spans[album.childId]).toEqual({ width: 2, height: 2 });

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.general?.albumWidth).toBe('auto');
		expect(before?.general?.columns).toBe('3');
		expect(before?.navigation?.albumsNavigation).toBe('below');

		const visitorBefore = await evidence.anonymous();
		try {
			const publicPage = await visitorBefore.newPage();
			const response = await publicPage.goto(catalog.pages.albumBetaLayout);
			expect(response.ok()).toBe(true);
			const css = await publicPage.locator('style').allTextContents();
			const style = css.join('\n');
			const root = `#jtg-album-${album.id}`;
			expect(style).toContain(`${root} { width:auto; }`);
			expect(style).not.toContain(`${root} { width:640px;}`);
			expect(style).not.toContain('25% - 6px');
			await evidence.capture(publicPage, 'album-layout-before');
		} finally {
			await evidence.closeVisitor(visitorBefore);
		}

		const childBefore = await evidence.anonymous();
		try {
			const publicPage = await childBefore.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaLayoutChild
			);
			expect(response.ok()).toBe(true);
			expect(
				await navigationPosition(publicPage, album.childId)
			).toBe('below');
			await evidence.capture(publicPage, 'album-layout-nav-below');
		} finally {
			await evidence.closeVisitor(childBefore);
		}

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					general: {
						albumType: 'grid',
						columns: '6',
						albumWidth: 'custom',
						width: '640px',
					},
					layout: {
						gutter: 12,
						tabletGutter: 8,
						mobileGutter: 4,
					},
					responsive: {
						enableResponsive: true,
						tabletColumns: 4,
						mobileColumns: 2,
					},
					navigation: {
						albumsNavigation: 'above',
					},
				},
			});
		}, album.id);
		expect(patched?.general?.columns).toBe('6');
		expect(patched?.general?.albumWidth).toBe('custom');
		expect(patched?.general?.width).toBe('640px');
		expect(patched?.layout?.gutter).toBe(12);
		expect(patched?.layout?.tabletGutter).toBe(8);
		expect(patched?.layout?.mobileGutter).toBe(4);
		expect(patched?.responsive?.tabletColumns).toBe(4);
		expect(patched?.responsive?.mobileColumns).toBe(2);
		expect(patched?.navigation?.albumsNavigation).toBe('above');

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.general?.columns).toBe('6');
		expect(reopened?.general?.albumType).toBe('grid');
		expect(reopened?.responsive?.enableResponsive).toBe(true);
		expect(reopened?.navigation?.albumsNavigation).toBe('above');

		const afterMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		const spansAfter = Object.fromEntries(
			(afterMembers?.members || []).map((row) => [
				row.id,
				{ width: row.width, height: row.height },
			])
		);
		expect(spansAfter[album.childA]).toEqual({ width: 1, height: 1 });
		expect(spansAfter[album.childId]).toEqual({ width: 2, height: 2 });

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(catalog.pages.albumBetaLayout);
			expect(response.ok()).toBe(true);
			const css = (await publicPage.locator('style').allTextContents()).join(
				'\n'
			);
			const root = `#jtg-album-${album.id}`;
			expect(css).toContain(`${root} { width:640px;}`);
			expect(css).not.toContain(`${root} { width:auto; }`);
			expect(css).toContain('16.666666666667% - 10px');
			expect(css).toContain('@media (min-width: 768px) and (max-width: 992px)');
			expect(css).toContain('25% - 6px');
			expect(css).toContain('@media (max-width: 768px)');
			expect(css).toContain('50% - 2px');
			await evidence.capture(publicPage, 'album-layout-after');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		const childAfter = await evidence.anonymous();
		try {
			const publicPage = await childAfter.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaLayoutChild
			);
			expect(response.ok()).toBe(true);
			expect(
				await navigationPosition(publicPage, album.childId)
			).toBe('above');
			await expect(
				publicPage.locator('.modula-albums-navigation-buttons')
			).toContainText('Layout child A');
			await evidence.capture(publicPage, 'album-layout-nav-above');
		} finally {
			await evidence.closeVisitor(childAfter);
		}

		await testInfo.attach('album-layout-responsive.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					childId: album.childId,
					columns: reopened?.general?.columns,
					albumWidth: reopened?.general?.albumWidth,
					tabletColumns: reopened?.responsive?.tabletColumns,
					mobileColumns: reopened?.responsive?.mobileColumns,
					albumsNavigation: reopened?.navigation?.albumsNavigation,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}

/**
 * @param {import('@playwright/test').Page} publicPage
 * @param {number} albumId
 * @return {Promise<'above'|'below'|'missing'>}
 */
async function navigationPosition(publicPage, albumId) {
	return publicPage.evaluate((id) => {
		const root = document.getElementById(`jtg-album-${id}`);
		const nav = root?.querySelector('.modula-albums-navigation-buttons');
		const items = root?.querySelector('.modula-items');
		if (!nav || !items) {
			return 'missing';
		}
		const following = nav.compareDocumentPosition(items);
		if (following & Node.DOCUMENT_POSITION_FOLLOWING) {
			return 'above';
		}
		return 'below';
	}, albumId);
}
