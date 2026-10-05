const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums editor title/status REST updates must keep WordPress post_password and
 * the anonymous visitor password gate. Classic enable/disable remains covered by
 * the Pro CLI seam on Password_Protect::save_extra_fields.
 *
 * Note: WordPress core clears post_password when status is `private` (mutual
 * exclusion with password visibility). This journey covers publish ↔ draft only.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album password preserve journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album title and status updates keep post password and anonymous gate', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaProtected;
		expect(album?.id).toBeTruthy();
		expect(album?.password).toBe('e2e-album-gate');

		// Any authenticated admin screen that boots wp.apiFetch.
		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const readPost = async () =>
			page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/wp/v2/modula-album/${albumId}?context=edit`,
				});
			}, album.id);

		const before = await readPost();
		expect(before?.status).toBe('publish');
		expect(before?.password).toBe(album.password);

		const renamedTitle = `${before.title?.raw || before.title} renamed`;
		await page.evaluate(
			async ({ albumId, title }) => {
				return window.wp.apiFetch({
					path: `/wp/v2/modula-album/${albumId}`,
					method: 'PUT',
					data: { title },
				});
			},
			{ albumId: album.id, title: renamedTitle }
		);

		const afterTitle = await readPost();
		expect(afterTitle?.title?.raw || afterTitle?.title).toBe(renamedTitle);
		expect(afterTitle?.password).toBe(album.password);

		for (const status of ['draft', 'publish']) {
			await page.evaluate(
				async ({ albumId, nextStatus }) => {
					return window.wp.apiFetch({
						path: `/wp/v2/modula-album/${albumId}`,
						method: 'PUT',
						data: { status: nextStatus },
					});
				},
				{ albumId: album.id, nextStatus: status }
			);
			const reopened = await readPost();
			expect(reopened?.status).toBe(status);
			expect(reopened?.password).toBe(album.password);
		}

		const settingsPatched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: { general: { mergeItems: false } },
			});
		}, album.id);
		expect(settingsPatched?.general?.mergeItems).toBe(false);

		const afterSettings = await readPost();
		expect(afterSettings?.password).toBe(album.password);
		expect(afterSettings?.status).toBe('publish');
		expect(afterSettings?.title?.raw || afterSettings?.title).toBe(
			renamedTitle
		);

		const members = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		expect(Array.isArray(members?.members)).toBe(true);
		expect(members.members.length).toBeGreaterThan(0);

		await page.evaluate(
			async ({ albumId, document }) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/members`,
					method: 'PUT',
					data: { members: document.members },
				});
			},
			{ albumId: album.id, document: members }
		);

		const afterMembers = await readPost();
		expect(afterMembers?.password).toBe(album.password);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaProtected
			);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator(`#jtg-album-${album.id}`)
			).toHaveCount(0);
			await expect(
				publicPage.locator('input[name="post_password"]')
			).toBeVisible();
			await evidence.capture(publicPage, 'album-beta-protected-gate');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		await testInfo.attach('album-password-preserve.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					renamedTitle,
					password: album.password,
					finalStatus: afterMembers?.status,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
