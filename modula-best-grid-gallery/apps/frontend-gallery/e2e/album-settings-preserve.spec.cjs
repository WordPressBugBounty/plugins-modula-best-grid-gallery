const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums editor REST save must update an owned setting (merge) without dropping
 * members or identity. Opaque flat-key preserve is covered by the Pro CLI seam
 * test; this journey exercises the real WordPress PATCH path in Compatible Pro.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album settings v2 write journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album merge setting PATCHes, reopens, and keeps members', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaMerge;
		expect(album?.id).toBeTruthy();

		// Any authenticated admin screen that boots wp.apiFetch.
		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const beforeMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		expect(Array.isArray(beforeMembers?.members)).toBe(true);
		expect(beforeMembers.members.length).toBeGreaterThan(0);
		const memberIds = beforeMembers.members.map((row) => row.id);

		const beforeSettings = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(beforeSettings?.general?.mergeItems).toBe(true);
		const priorGutter = beforeSettings?.layout?.gutter;

		const postBefore = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
		}, album.id);
		expect(postBefore?.status).toBe('publish');
		expect(postBefore?.id).toBe(album.id);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					general: { mergeItems: false },
					client_injection: { evil: 'overwrite-opaque' },
				},
			});
		}, album.id);
		expect(patched?.general?.mergeItems).toBe(false);
		expect(patched).not.toHaveProperty('client_injection');

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.general?.mergeItems).toBe(false);
		expect(reopened?.layout?.gutter).toBe(priorGutter);

		const afterMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		expect(afterMembers.members.map((row) => row.id)).toEqual(memberIds);

		const postAfter = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/wp/v2/modula-album/${albumId}?context=edit`,
			});
		}, album.id);
		expect(postAfter?.status).toBe(postBefore.status);
		expect(postAfter?.id).toBe(album.id);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(catalog.pages.albumBetaMerge);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator(`#jtg-album-${album.id}`)
			).toBeVisible();
			await evidence.capture(publicPage, 'album-beta-merge-visitor');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		await testInfo.attach('album-merge-patch.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					memberIds,
					beforeMergeItems: beforeSettings?.general?.mergeItems,
					afterMergeItems: reopened?.general?.mergeItems,
					opaqueSeed: album.opaque,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
