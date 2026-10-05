const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums Apply preset: listing/REST apply replaces supported settings, keeps
 * members and opaque keys, and preserves protection when the preset omits it.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album apply preset journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album apply preset overwrites settings, keeps members and omitted protection', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaApplyPreset;
		const protectedAlbum = catalog.albums?.betaApplyPresetProtected;
		expect(album?.id).toBeTruthy();
		expect(album?.presetId).toBeTruthy();
		expect(protectedAlbum?.id).toBeTruthy();
		expect(protectedAlbum?.password).toBe('e2e-apply-preset-gate');

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const readSettings = async (albumId) =>
			page.evaluate(async (id) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${id}/settings`,
				});
			}, albumId);

		const readMembers = async (albumId) =>
			page.evaluate(async (id) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${id}/members`,
				});
			}, albumId);

		const applyPreset = async (albumId, presetId) =>
			page.evaluate(
				async ({ id, preset }) => {
					return window.wp.apiFetch({
						path: `/modula-defaults/v1/albums/${id}/apply/${preset}`,
						method: 'POST',
					});
				},
				{ id: albumId, preset: presetId }
			);

		const beforeMembers = await readMembers(album.id);
		expect(Array.isArray(beforeMembers?.members)).toBe(true);
		expect(beforeMembers.members.length).toBe(album.members);
		const memberIds = beforeMembers.members.map((row) => row.id);

		const before = await readSettings(album.id);
		expect(before?.general?.albumType).toBe('custom-grid');
		expect(before?.layout?.gutter).toBe(99);
		expect(before?.general?.mergeItems).toBe(true);

		const applied = await applyPreset(album.id, album.presetId);
		expect(applied?.albumId).toBe(album.id);
		expect(applied?.presetId).toBe(album.presetId);
		expect(applied?.settings?.layout?.gutter).toBe(28);
		expect(applied?.settings?.general?.albumType).toBe('grid');
		expect(applied?.settings?.general?.mergeItems).toBe(false);

		const reopened = await readSettings(album.id);
		expect(reopened?.layout?.gutter).toBe(28);
		expect(reopened?.general?.albumType).toBe('grid');
		expect(reopened?.general?.mergeItems).toBe(false);

		const afterMembers = await readMembers(album.id);
		expect(afterMembers.members.map((row) => row.id)).toEqual(memberIds);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaApplyPreset
			);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator(`#jtg-album-${album.id}`)
			).toBeVisible({ timeout: 30000 });
			const css = (
				await publicPage.locator('style').allTextContents()
			).join('\n');
			const root = `#jtg-album-${album.id}`;
			// preset type=3 columns + gutter 28 → gap fragment 18.666…
			expect(css).toContain(
				`${root}.modula-album .modula-item { width: calc(33.333333333333% - 18.666666666667px)`
			);
			await evidence.capture(publicPage, 'album-apply-preset-visitor');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		const protectedBefore = await readSettings(protectedAlbum.id);
		expect(protectedBefore?.passwordProtect?.enablePassword).toBe(true);
		expect(protectedBefore?.layout?.gutter).toBe(40);

		const protectedPostBefore = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
		}, protectedAlbum.id);
		expect(protectedPostBefore?.password).toBe(protectedAlbum.password);

		const protectedApplied = await applyPreset(
			protectedAlbum.id,
			protectedAlbum.presetId
		);
		expect(protectedApplied?.settings?.layout?.gutter).toBe(28);
		expect(
			protectedApplied?.settings?.passwordProtect?.enablePassword
		).toBe(true);

		const protectedReopened = await readSettings(protectedAlbum.id);
		expect(protectedReopened?.layout?.gutter).toBe(28);
		expect(protectedReopened?.passwordProtect?.enablePassword).toBe(true);
		expect(protectedReopened?.passwordProtect?.password).toBe(
			protectedAlbum.password
		);

		const protectedPostAfter = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
		}, protectedAlbum.id);
		expect(protectedPostAfter?.password).toBe(protectedAlbum.password);

		const gatedVisitor = await evidence.anonymous();
		try {
			const publicPage = await gatedVisitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaApplyPresetProtected
			);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator(`#jtg-album-${protectedAlbum.id}`)
			).toHaveCount(0);
			await expect(
				publicPage.locator('input[name="post_password"]')
			).toBeVisible();
			await evidence.capture(
				publicPage,
				'album-apply-preset-protected-gate'
			);
		} finally {
			await evidence.closeVisitor(gatedVisitor);
		}

		await testInfo.attach('album-apply-preset.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					protectedAlbumId: protectedAlbum.id,
					presetId: album.presetId,
					memberIds,
					appliedGutter: reopened?.layout?.gutter,
					protectedGate: protectedAlbum.password,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
