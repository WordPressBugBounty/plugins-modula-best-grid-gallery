const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Classic sparse albums open with effective legacy defaults; Try the beta
 * duplicates as draft without mutating the source; Convert keeps identity,
 * members, status, and protection. CLI covers idempotent migration details.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album migrate/try/convert journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album open migrate, Try the beta, and Convert preserve settings', async ({
		page,
		evidence,
	}, testInfo) => {
		const sparse = catalog.albums?.classicSparse;
		const convert = catalog.albums?.classicConvert;
		const protectedAlbum = catalog.albums?.classicProtected;
		expect(sparse?.id).toBeTruthy();
		expect(convert?.id).toBeTruthy();
		expect(protectedAlbum?.id).toBeTruthy();
		expect(protectedAlbum?.password).toBe('e2e-classic-gate');

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const opened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, sparse.id);
		expect(opened?.layout?.gutter).toBe(20);
		expect(opened?.hover?.cursor).toBe('pointer');
		expect(opened?.hover?.hoverPadding).toBe(0);
		expect(opened?.hover?.hoverColor).toBe('#000000');
		expect(opened?.captions?.titleFontSize).toBe(0);

		const sourceBeforeTry = await page.evaluate(async (albumId) => {
			const post = await window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
			const settings = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
			const members = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
			return { post, settings, members };
		}, sparse.id);
		expect(sourceBeforeTry.post?.status).toBe('publish');
		expect(sourceBeforeTry.post?.password || '').toBe('');

		const tryResult = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/listing/${albumId}/try-beta`,
				method: 'POST',
			});
		}, sparse.id);
		expect(tryResult?.id).toBeTruthy();
		expect(tryResult.id).not.toBe(sparse.id);
		expect(tryResult?.status).toBe('draft');

		const sourceAfterTry = await page.evaluate(async (albumId) => {
			const post = await window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
			const settings = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
			const members = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
			const beta = await window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit&_fields=id,meta`,
			}).catch(() => null);
			return { post, settings, members, beta };
		}, sparse.id);
		expect(sourceAfterTry.post?.status).toBe('publish');
		expect(sourceAfterTry.post?.id).toBe(sparse.id);
		expect(sourceAfterTry.settings?.layout?.gutter).toBe(20);
		expect(sourceAfterTry.settings?.hover?.cursor).toBe('pointer');
		expect(JSON.stringify(sourceAfterTry.members)).toBe(
			JSON.stringify(sourceBeforeTry.members)
		);

		const tryCopy = await page.evaluate(async (albumId) => {
			const post = await window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
			const settings = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
			return { post, settings };
		}, tryResult.id);
		expect(tryCopy.post?.status).toBe('draft');
		expect(tryCopy.settings?.layout?.gutter).toBe(20);
		expect(tryCopy.settings?.hover?.cursor).toBe('pointer');
		expect(tryCopy.settings?.hover?.hoverPadding).toBe(0);

		const convertBefore = await page.evaluate(async (albumId) => {
			const post = await window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
			const members = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
			return { post, members };
		}, convert.id);
		expect(convertBefore.post?.status).toBe('publish');

		const convertResult = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/listing/${albumId}/convert-beta`,
				method: 'POST',
			});
		}, convert.id);
		expect(convertResult?.id).toBe(convert.id);

		const convertAfter = await page.evaluate(async (albumId) => {
			const post = await window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
			const settings = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
			const members = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
			return { post, settings, members };
		}, convert.id);
		expect(convertAfter.post?.id).toBe(convert.id);
		expect(convertAfter.post?.status).toBe('publish');
		expect(convertAfter.settings?.layout?.gutter).toBe(14);
		expect(convertAfter.settings?.hover?.cursor).toBe('crosshair');
		expect(JSON.stringify(convertAfter.members)).toBe(
			JSON.stringify(convertBefore.members)
		);

		const protectedBefore = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
		}, protectedAlbum.id);
		expect(protectedBefore?.password).toBe(protectedAlbum.password);

		const protectedConvert = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/listing/${albumId}/convert-beta`,
				method: 'POST',
			});
		}, protectedAlbum.id);
		expect(protectedConvert?.id).toBe(protectedAlbum.id);

		const protectedAfter = await page.evaluate(async (albumId) => {
			const post = await window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
			const settings = await window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
			return { post, settings };
		}, protectedAlbum.id);
		expect(protectedAfter.post?.password).toBe(protectedAlbum.password);
		expect(protectedAfter.post?.status).toBe('publish');
		expect(protectedAfter.settings?.layout?.gutter).toBe(16);
		expect(protectedAfter.settings?.hover?.cursor).toBe('pointer');

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumClassicProtected
			);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator('form.post-password-form, input[type="password"]').first()
			).toBeVisible();
			await evidence.capture(publicPage, 'album-classic-protected-gate');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		await testInfo.attach('album-migrate-try-convert.json', {
			body: JSON.stringify(
				{
					sparseId: sparse.id,
					tryCopyId: tryResult.id,
					convertId: convert.id,
					protectedId: protectedAlbum.id,
					openedCursor: opened?.hover?.cursor,
					tryCopyCursor: tryCopy.settings?.hover?.cursor,
					convertCursor: convertAfter.settings?.hover?.cursor,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
