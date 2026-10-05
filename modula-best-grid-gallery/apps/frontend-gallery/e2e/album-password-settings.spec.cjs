const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums Password Protect: settings PATCH enable/change/disable syncs
 * WordPress post_password. Omitting passwordProtect leaves the gate alone.
 * Extends ticket 02's protected-album regression with explicit settings ops.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album password settings journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album password settings enable change disable and omit', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaPasswordSettings;
		expect(album?.id).toBeTruthy();
		const gate = album.password;
		expect(gate).toBe('e2e-album-settings-gate');

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const readPost = async () =>
			page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/wp/v2/modula-album/${albumId}?context=edit`,
				});
			}, album.id);

		const readSettings = async () =>
			page.evaluate(async (albumId) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
				});
			}, album.id);

		const before = await readSettings();
		expect(before?.passwordProtect?.enablePassword).toBe(false);
		expect(before?.layout?.gutter).toBe(16);

		const beforePost = await readPost();
		expect(beforePost?.password || '').toBe('');

		const enabled = await page.evaluate(
			async ({ albumId, password }) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
					method: 'PATCH',
					data: {
						passwordProtect: {
							enablePassword: true,
							password,
							passwordProtectUsername: 'e2e-user',
							passwordProtectText: 'E2E album gate message',
						},
						layout: { gutter: 16 },
					},
				});
			},
			{ albumId: album.id, password: gate }
		);
		expect(enabled?.passwordProtect?.enablePassword).toBe(true);
		expect(enabled?.passwordProtect?.password).toBe(gate);
		expect(enabled?.passwordProtect?.passwordProtectUsername).toBe(
			'e2e-user'
		);
		expect(enabled?.passwordProtect?.passwordProtectText).toBe(
			'E2E album gate message'
		);
		expect(enabled?.layout?.gutter).toBe(16);

		const afterEnablePost = await readPost();
		expect(afterEnablePost?.password).toBe(gate);

		const reopened = await readSettings();
		expect(reopened?.passwordProtect?.enablePassword).toBe(true);
		expect(reopened?.passwordProtect?.password).toBe(gate);
		expect(reopened?.passwordProtect?.passwordProtectUsername).toBe(
			'e2e-user'
		);
		expect(reopened?.passwordProtect?.passwordProtectText).toBe(
			'E2E album gate message'
		);

		const changedPassword = `${gate}-rotated`;
		const changed = await page.evaluate(
			async ({ albumId, password }) => {
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/settings`,
					method: 'PATCH',
					data: {
						passwordProtect: {
							enablePassword: true,
							password,
						},
					},
				});
			},
			{ albumId: album.id, password: changedPassword }
		);
		expect(changed?.passwordProtect?.password).toBe(changedPassword);
		expect((await readPost())?.password).toBe(changedPassword);

		// Unrelated layout PATCH must not clear the gate (omit passwordProtect).
		const layoutOnly = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: { layout: { gutter: 24 } },
			});
		}, album.id);
		expect(layoutOnly?.layout?.gutter).toBe(24);
		expect(layoutOnly?.passwordProtect?.enablePassword).toBe(true);
		expect((await readPost())?.password).toBe(changedPassword);

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaPasswordSettings
			);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator(`#jtg-album-${album.id}`)
			).toHaveCount(0);
			const passwordInput = publicPage.locator(
				'input[name="post_password"]'
			);
			const usernameInput = publicPage.locator(
				'input[name="password_protect_username"]'
			);
			await expect(passwordInput).toBeVisible();
			await expect(usernameInput).toBeVisible();
			await expect(publicPage.getByText('E2E album gate message')).toBeVisible();

			await usernameInput.fill('e2e-user');
			await passwordInput.fill('wrong-password');
			await publicPage
				.locator('input[type="submit"], button[type="submit"]')
				.first()
				.click();
			await publicPage.waitForLoadState('domcontentloaded');
			await expect(
				publicPage.locator(`#jtg-album-${album.id}`)
			).toHaveCount(0);
			await expect(
				publicPage.locator('input[name="post_password"]')
			).toBeVisible();
			await evidence.capture(publicPage, 'album-password-wrong');

			await publicPage
				.locator('input[name="password_protect_username"]')
				.fill('e2e-user');
			await publicPage
				.locator('input[name="post_password"]')
				.fill(changedPassword);
			await publicPage
				.locator('input[type="submit"], button[type="submit"]')
				.first()
				.click();
			await publicPage.waitForLoadState('domcontentloaded');
			await expect(
				publicPage.locator(`#jtg-album-${album.id}`)
			).toBeVisible();
			await evidence.capture(publicPage, 'album-password-correct');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		const disabled = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					passwordProtect: {
						enablePassword: false,
					},
				},
			});
		}, album.id);
		expect(disabled?.passwordProtect?.enablePassword).toBe(false);
		expect((await readPost())?.password || '').toBe('');

		const visitorAfterDisable = await evidence.anonymous();
		try {
			const publicPage = await visitorAfterDisable.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaPasswordSettings
			);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator(`#jtg-album-${album.id}`)
			).toBeVisible();
			await expect(
				publicPage.locator('input[name="post_password"]')
			).toHaveCount(0);
			await evidence.capture(publicPage, 'album-password-disabled');
		} finally {
			await evidence.closeVisitor(visitorAfterDisable);
		}

		await testInfo.attach('album-password-settings.json', {
			body: JSON.stringify(
				{
					albumId: album.id,
					enabledThenChanged: true,
					omitPreserved: true,
					disabled: true,
					// Do not attach plaintext passwords beyond the fixture key name.
					fixturePasswordKey: 'albums.betaPasswordSettings.password',
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
