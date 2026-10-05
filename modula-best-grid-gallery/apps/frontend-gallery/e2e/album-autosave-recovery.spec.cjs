const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

const saveStatus = '.modula-album-takeover__topbar-save-status';

/**
 * Albums editor autosave recovery: failed settings PATCH retains edits, retry
 * via a further edit persists the latest values, reopen + anonymous visitor
 * match. Rapid settings + members updates do not cross-clobber.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album autosave recovery journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album failed-save retry reopen and mixed settings members persist', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.autosaveLayout;
		const membersAlbum = catalog.albums?.autosaveMembers;
		expect(album?.id).toBeTruthy();
		expect(album?.editor).toBeTruthy();
		expect(membersAlbum?.id).toBeTruthy();
		expect(membersAlbum?.editor).toBeTruthy();
		expect(membersAlbum?.galleryA).toBeTruthy();

		const rejectedGutter = 28;
		const retryColumns = 6;

		await page.goto(album.editor);
		await expect(
			page.locator('.modula-album-takeover__shell').first()
		).toBeVisible({ timeout: 60000 });
		const sharedState = () =>
			page.evaluate(
				async ({ layout, members }) => ({
					settings: await window.wp.apiFetch({
						path: `/modula/v2/album/${layout}/settings`,
					}),
					members: await window.wp.apiFetch({
						path: `/modula/v2/album/${members}/members`,
					}),
				}),
				{
					layout: catalog.albums.betaLayout.id,
					members: catalog.albums.betaPublicResult.id,
				}
			);
		const sharedBefore = await sharedState();

		await page
			.getByRole('button', { name: 'Open Layout settings' })
			.click();
		await page
			.locator('.modula-album-takeover__shell')
			.getByRole('button', { name: /^Album layout/ })
			.first()
			.click();
		const gutterInput = gutterControl(page);
		await expect(gutterInput).toBeVisible({ timeout: 15000 });
		const startingGutter = Number(await gutterInput.inputValue());
		expect(startingGutter).not.toBe(rejectedGutter);

		const settingsUrl = `**/modula/v2/album/${album.id}/settings*`;
		await page.route(settingsUrl, async (route) => {
			if (!isSettingsWrite(route.request())) {
				return route.continue();
			}
			await route.fulfill({
				status: 503,
				contentType: 'application/json',
				body: JSON.stringify({
					code: 'e2e_save_failure',
					message: 'E2E: save unavailable; your edits are retained.',
					data: { status: 503 },
				}),
			});
		});

		const failed = settingsResponse(page, album.id, 503);
		await gutterInput.fill(String(rejectedGutter));
		await gutterInput.press('Tab');
		await failed;
		await expect(page.locator(saveStatus)).toHaveText(
			'E2E: save unavailable; your edits are retained.'
		);
		await expect(gutterInput).toHaveValue(String(rejectedGutter));
		await evidence.capture(page, 'retained-edits-after-save-failure');
		await page.unroute(settingsUrl);

		// Retry via a distinct field while retaining the failed gutter value.
		const columnsControl = page
			.locator('.modula-album-takeover__shell')
			.getByRole('button', { name: /columns/i })
			.first();
		await expect(columnsControl).toBeVisible({ timeout: 15000 });
		const retried = settingsResponse(page, album.id, 200);
		await columnsControl.click();
		await page
			.getByRole('option', {
				name: 'Six columns (6)',
				exact: true,
			})
			.click();
		const response = await retried;
		const persisted = await response.json();
		expect(Number(persisted.layout.gutter)).toBe(rejectedGutter);
		expect(String(persisted.general.columns)).toBe(String(retryColumns));
		await testInfo.attach('saved-settings-after-retry', {
			body: JSON.stringify(persisted, null, 2),
			contentType: 'application/json',
		});
		await expect(page.locator(saveStatus)).toHaveText('Saved', {
			timeout: 15000,
		});

		await page.goto(album.editor);
		await expect(
			page.locator('.modula-album-takeover__shell').first()
		).toBeVisible({ timeout: 60000 });
		await page
			.getByRole('button', { name: 'Open Layout settings' })
			.click();
		await page
			.locator('.modula-album-takeover__shell')
			.getByRole('button', { name: /^Album layout/ })
			.first()
			.click();
		await expect(gutterControl(page)).toHaveValue(String(rejectedGutter), {
			timeout: 15000,
		});
		await evidence.capture(page, 'editor-reopened');

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const nav = await publicPage.goto(
				catalog.pages.albumAutosaveLayout
			);
			expect(nav.ok()).toBe(true);
			const css = (
				await publicPage.locator('style').allTextContents()
			).join('\n');
			const root = `#jtg-album-${album.id}`;
			// 6 columns + gutter 28 → width calc uses gutter*(columns-1)/columns.
			expect(css).toContain(
				`${root}.modula-album .modula-item { width: calc(16.666666666667% - 23.333333333333px)`
			);
			await evidence.capture(publicPage, 'visitor-after-retry');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		// Rapid mixed settings + members: both survive without cross-clobber.
		await page.goto(membersAlbum.editor);
		await expect(
			page.locator('.modula-album-takeover__shell').first()
		).toBeVisible({ timeout: 60000 });
		await expect(
			page
				.locator('[data-modula-album-canvas-layout="custom-grid"]')
				.first()
		).toBeVisible({ timeout: 60000 });

		const membersBefore = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, membersAlbum.id);
		const cellBefore = cellFor(membersBefore, membersAlbum.galleryA);
		expect(cellBefore).toBeTruthy();

		await page
			.getByRole('button', { name: 'Open Layout settings' })
			.click();
		await page
			.locator('.modula-album-takeover__shell')
			.getByRole('button', { name: /^Album layout/ })
			.first()
			.click();
		const membersGutter = gutterControl(page);
		await expect(membersGutter).toBeVisible({ timeout: 15000 });
		const mixedGutter =
			Number(await membersGutter.inputValue()) === 22 ? 24 : 22;

		const settingsOk = settingsResponse(page, membersAlbum.id, 200);
		const membersOk = membersResponse(page, membersAlbum.id, 200);

		await membersGutter.fill(String(mixedGutter));
		await membersGutter.press('Tab');

		const tile = page
			.locator('.modula-album-takeover__member-rgl-item')
			.filter({
				has: page.locator(
					`[data-modula-album-member-id="${membersAlbum.galleryA}"]`
				),
			})
			.first();
		const dragTarget =
			(await tile.count()) > 0
				? tile
				: page
						.locator('.modula-album-takeover__member-rgl-item')
						.nth(1);
		await expect(dragTarget).toBeVisible();
		const box = await dragTarget.boundingBox();
		expect(box).toBeTruthy();
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(
			box.x + box.width / 2 + 140,
			box.y + box.height / 2 + 50,
			{ steps: 12 }
		);
		await page.mouse.up();

		const [settingsBody, membersBody] = await Promise.all([
			settingsOk.then((r) => r.json()),
			membersOk.then((r) => r.json()),
		]);
		expect(Number(settingsBody.layout.gutter)).toBe(mixedGutter);
		const cellAfter = cellFor(membersBody, membersAlbum.galleryA);
		expect(cellAfter).toBeTruthy();
		expect(
			cellAfter.gridX !== cellBefore.gridX ||
				cellAfter.gridY !== cellBefore.gridY
		).toBe(true);

		await expect(page.locator(saveStatus)).toHaveText('Saved', {
			timeout: 15000,
		});

		const settingsReopen = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, membersAlbum.id);
		const membersReopen = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, membersAlbum.id);
		expect(Number(settingsReopen.layout.gutter)).toBe(mixedGutter);
		expect(cellFor(membersReopen, membersAlbum.galleryA)).toEqual(
			cellAfter
		);
		expect(await sharedState()).toEqual(sharedBefore);
		await testInfo.attach('mixed-settings-members-after-save', {
			body: JSON.stringify(
				{ settings: settingsReopen, members: membersReopen },
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}

function isSettingsWrite(request) {
	return (
		request.method() === 'PATCH' ||
		request.headers()['x-http-method-override'] === 'PATCH'
	);
}

function isMembersWrite(request) {
	return (
		request.method() === 'PUT' ||
		request.headers()['x-http-method-override'] === 'PUT'
	);
}

function settingsResponse(page, albumId, status = 200) {
	return page.waitForResponse(
		(response) =>
			response.url().includes(`/modula/v2/album/${albumId}/settings`) &&
			isSettingsWrite(response.request()) &&
			response.status() === status,
		{ timeout: 20000 }
	);
}

function membersResponse(page, albumId, status = 200) {
	return page.waitForResponse(
		(response) =>
			response.url().includes(`/modula/v2/album/${albumId}/members`) &&
			isMembersWrite(response.request()) &&
			response.status() === status,
		{ timeout: 20000 }
	);
}

function gutterControl(page) {
	const shell = page.locator('.modula-album-takeover__shell');
	return shell
		.getByText('Space between album images', { exact: true })
		.locator(
			'xpath=ancestor::*[.//input[@type="number"]][1]//input[@type="number"]'
		)
		.first();
}

function cellFor(doc, memberId) {
	const row = (doc?.members || []).find(
		(entry) => Number(entry.id) === Number(memberId)
	);
	if (!row) {
		return null;
	}
	return {
		gridX: row.gridX,
		gridY: row.gridY,
		width: row.width,
		height: row.height,
	};
}
