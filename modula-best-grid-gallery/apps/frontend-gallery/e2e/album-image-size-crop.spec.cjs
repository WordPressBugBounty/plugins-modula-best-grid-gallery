const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Album image size, custom dimensions/crop, and member covers survive PATCH,
 * reopen, and drive anonymous cover output. Catalog sizes stay selectable via
 * the Albums editor contract; this journey asserts REST + visitor derivatives.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album image size journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album custom image size and member cover PATCH reopen publicly', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaImageSize;
		expect(album?.id).toBeTruthy();
		expect(album?.altCover).toBeTruthy();
		expect(album?.galleryA).toBeTruthy();
		expect(album?.nestedId).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const beforeSettings = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(beforeSettings?.layout?.imageSize).toBe('medium');
		expect(beforeSettings?.layout?.cropImages).toBe(false);

		const beforeMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		expect(beforeMembers?.members?.length).toBe(3);
		const beforeIds = beforeMembers.members.map((row) => row.id);
		expect(beforeIds).toEqual([
			album.galleryA,
			album.galleryB,
			album.nestedId,
		]);
		const galleryA = beforeMembers.members.find(
			(row) => row.id === album.galleryA
		);
		const nested = beforeMembers.members.find(
			(row) => row.id === album.nestedId
		);
		expect(Number(galleryA.cover)).toBe(Number(album.coverAttachment));
		expect(String(galleryA.shuffleCover)).toBe('0');
		expect(galleryA.itemType).toBe('modula-gallery');
		expect(nested.itemType).toBe('modula-album');

		const visitorBefore = await evidence.anonymous();
		try {
			const publicPage = await visitorBefore.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaImageSize
			);
			expect(response.ok()).toBe(true);
			const albumRoot = publicPage.locator(`#jtg-album-${album.id}`).first();
			await expect(albumRoot).toBeVisible();
			const cover = albumRoot.locator(
				`img[data-image-id="${album.coverAttachment}"]`
			);
			await expect(cover.first()).toBeVisible();
			await evidence.capture(publicPage, 'album-image-size-before');
		} finally {
			await evidence.closeVisitor(visitorBefore);
		}

		const patchedSettings = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					layout: {
						imageSize: 'custom',
						imageDimensions: { width: 200, height: 150 },
						cropImages: true,
					},
				},
			});
		}, album.id);
		expect(patchedSettings?.layout?.imageSize).toBe('custom');
		expect(patchedSettings?.layout?.imageDimensions).toEqual({
			width: 200,
			height: 150,
		});
		expect(patchedSettings?.layout?.cropImages).toBe(true);

		const reopenedSettings = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopenedSettings?.layout?.imageSize).toBe('custom');
		expect(reopenedSettings?.layout?.imageDimensions).toEqual({
			width: 200,
			height: 150,
		});
		expect(reopenedSettings?.layout?.cropImages).toBe(true);

		const patchedMembers = await page.evaluate(
			async ({ albumId, members, galleryA, altCover }) => {
				const next = {
					members: members.map((row) => {
						const base = {
							id: row.id,
							itemType: row.itemType,
							title: row.title,
							caption: row.caption,
							alt: row.alt,
							customurl: row.customurl,
							cover: row.cover,
							shuffleCover: row.shuffleCover,
							width: row.width,
							height: row.height,
						};
						if (row.id === galleryA) {
							return {
								...base,
								cover: altCover,
								// Keep shuffle off so the public cover stays the chosen attachment.
								shuffleCover: '0',
							};
						}
						return base;
					}),
				};
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/members`,
					method: 'PUT',
					data: next,
				});
			},
			{
				albumId: album.id,
				members: beforeMembers.members,
				galleryA: album.galleryA,
				altCover: album.altCover,
			}
		);
		expect(patchedMembers?.members?.[0]?.cover).toBeTruthy();
		expect(Number(patchedMembers.members[0].cover)).toBe(
			Number(album.altCover)
		);
		expect(String(patchedMembers.members[0].shuffleCover)).toBe('0');
		expect(String(patchedMembers.members[1].shuffleCover)).toBe('1');
		expect(patchedMembers.members.map((row) => row.id)).toEqual(beforeIds);
		expect(patchedMembers.members[2].itemType).toBe('modula-album');

		const reopenedMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		expect(Number(reopenedMembers.members[0].cover)).toBe(
			Number(album.altCover)
		);
		expect(String(reopenedMembers.members[0].shuffleCover)).toBe('0');
		expect(String(reopenedMembers.members[1].shuffleCover)).toBe('1');
		expect(reopenedMembers.members.map((row) => row.id)).toEqual(beforeIds);
		expect(reopenedMembers.members[2].itemType).toBe('modula-album');

		const visitorAfter = await evidence.anonymous();
		try {
			const publicPage = await visitorAfter.newPage();
			const response = await publicPage.goto(
				`${catalog.pages.albumBetaImageSize}?modula_e2e=${Date.now()}`
			);
			expect(response.ok()).toBe(true);
			const albumRoot = publicPage.locator(`#jtg-album-${album.id}`).first();
			await expect(albumRoot).toBeVisible();

			const cover = albumRoot.locator(
				`img[data-image-id="${album.altCover}"]`
			);
			await expect(cover.first()).toBeVisible();
			expect(Number(await cover.first().getAttribute('width'))).toBe(200);
			expect(Number(await cover.first().getAttribute('height'))).toBe(150);
			const src =
				(await cover.first().getAttribute('src')) ||
				(await cover.first().getAttribute('data-src')) ||
				'';
			expect(src).toMatch(/200x150/);
			await evidence.capture(publicPage, 'album-image-size-after');
		} finally {
			await evidence.closeVisitor(visitorAfter);
		}

		const registered = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					layout: {
						imageSize: 'modula-e2e-small',
						cropImages: false,
					},
				},
			});
		}, album.id);
		expect(registered?.layout?.imageSize).toBe('modula-e2e-small');

		const registeredReopen = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(registeredReopen?.layout?.imageSize).toBe('modula-e2e-small');

		const visitorRegistered = await evidence.anonymous();
		try {
			const publicPage = await visitorRegistered.newPage();
			const response = await publicPage.goto(
				`${catalog.pages.albumBetaImageSize}?modula_e2e=${Date.now()}-reg`
			);
			expect(response.ok()).toBe(true);
			const cover = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first()
				.locator(`img[data-image-id="${album.altCover}"]`)
				.first();
			await expect(cover).toBeVisible();
			expect(Number(await cover.getAttribute('width'))).toBe(320);
			expect(Number(await cover.getAttribute('height'))).toBe(240);
			await evidence.capture(publicPage, 'album-image-size-registered');
		} finally {
			await evidence.closeVisitor(visitorRegistered);
		}

		await testInfo.attach('album-image-size-summary', {
			body: Buffer.from(
				JSON.stringify(
					{
						albumId: album.id,
						imageSize: 'custom',
						dimensions: { width: 200, height: 150 },
						cropImages: true,
						coverBefore: album.coverAttachment,
						coverAfter: album.altCover,
						memberOrder: beforeIds,
					},
					null,
					2
				),
				'utf8'
			),
			contentType: 'application/json',
		});
	});
}
