const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Public-result inspection: Albums editor shortcode iframe matches anonymous
 * visitor (captions, hover, Lightbox). Custom-grid placement notice. Dirty
 * save-status notice. Authoring canvas remains usable after returning.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album public-result inspection journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album public-result inspection matches anonymous visitor', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaPublicResult;
		const protectedAlbum = catalog.albums?.betaProtected;
		expect(album?.id).toBeTruthy();
		expect(album?.editor).toBeTruthy();
		expect(album?.tileTitle).toBe('E2E public result tile A');
		expect(protectedAlbum?.id).toBeTruthy();
		expect(protectedAlbum?.editor).toBeTruthy();

		await page.goto(album.editor);
		await expect(
			page.locator('.modula-album-takeover__shell').first()
		).toBeVisible({ timeout: 60000 });
		await expect(
			page.locator('.modula-album-takeover__member-tile').first()
		).toBeVisible({ timeout: 60000 });

		const publicResultToggle = page.locator(
			'[data-modula-public-result-toggle="1"]'
		);
		await expect(publicResultToggle).toBeVisible();
		await publicResultToggle.click();

		const inspection = page.locator(
			'[data-modula-album-public-result="1"]'
		);
		await expect(inspection).toBeVisible();
		await expect(
			page.locator('[data-modula-public-result-placement="1"]')
		).toBeVisible();
		await expect(
			page.locator('[data-modula-public-result-last-saved="1"]')
		).toHaveCount(0);

		const frame = page.frameLocator(
			'[data-modula-public-result-frame="1"]'
		);
		const albumRoot = frame.locator(`#jtg-album-${album.id}`).first();
		await expect(albumRoot).toBeVisible({ timeout: 60000 });
		await expect(
			albumRoot.locator('.modula-item.effect-lily').first()
		).toBeVisible();
		await expect(albumRoot.getByText(album.tileTitle).first()).toBeVisible();

		const inspectTitleColor = await albumRoot
			.locator('.jtg-title')
			.first()
			.evaluate((el) => getComputedStyle(el).color);
		expect(inspectTitleColor).toMatch(/rgb\(\s*0,\s*170,\s*187\s*\)/);

		await albumRoot
			.locator(`.gallery-link[data-gallery-id="${album.galleryA}"]`)
			.first()
			.click();
		await expect(
			frame.locator('.modula-fancybox-container').first()
		).toBeVisible({ timeout: 15000 });
		await frame.locator('body').press('Escape');

		await evidence.capture(page, 'album-public-result-inspection');

		// Dirty notice while inspecting: flip a Layout hub toggle; iframe stays on last save.
		const layoutBtn = page.getByRole('button', {
			name: 'Open Layout settings',
		});
		await layoutBtn.click();
		const responsiveToggle = page
			.locator('.modula-album-takeover__shell')
			.getByRole('switch')
			.first();
		await expect(responsiveToggle).toBeVisible({ timeout: 15000 });
		await responsiveToggle.click();
		await expect(
			page.locator('[data-modula-public-result-last-saved="1"]')
		).toBeVisible({ timeout: 10000 });

		// Wait for autosave so authoring return is clean.
		await expect(
			page.locator('[data-modula-public-result-last-saved="1"]')
		).toHaveCount(0, { timeout: 30000 });

		await publicResultToggle.click();
		await expect(
			page.locator('.modula-album-takeover__member-tile').first()
		).toBeVisible();
		// Select multiple still works on authoring canvas.
		await page
			.getByRole('button', { name: 'Select multiple' })
			.click();
		await expect(
			page.getByRole('button', { name: 'Done selecting' })
		).toBeVisible();
		await page.getByRole('button', { name: 'Done selecting' }).click();

		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaPublicResult
			);
			expect(response.ok()).toBe(true);
			const publicRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(publicRoot).toBeVisible();
			await expect(
				publicRoot.locator('.modula-item.effect-lily').first()
			).toBeVisible();
			await expect(
				publicRoot.getByText(album.tileTitle).first()
			).toBeVisible();
			const publicTitleColor = await publicRoot
				.locator('.jtg-title')
				.first()
				.evaluate((el) => getComputedStyle(el).color);
			expect(publicTitleColor).toBe(inspectTitleColor);

			await publicRoot
				.locator(`.gallery-link[data-gallery-id="${album.galleryA}"]`)
				.first()
				.click();
			await expect(
				publicPage.locator('.modula-fancybox-container').first()
			).toBeVisible({ timeout: 15000 });
			await evidence.capture(publicPage, 'album-public-result-visitor');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		// Password-protected album: editor inspection works; anonymous still gated.
		await page.goto(protectedAlbum.editor);
		await expect(
			page.locator('.modula-album-takeover__shell').first()
		).toBeVisible({ timeout: 60000 });
		await page.locator('[data-modula-public-result-toggle="1"]').click();
		const protectedFrame = page.frameLocator(
			'[data-modula-public-result-frame="1"]'
		);
		await expect(
			protectedFrame.locator(`#jtg-album-${protectedAlbum.id}`).first()
		).toBeVisible({ timeout: 60000 });

		const protectedVisitor = await evidence.anonymous();
		try {
			const publicPage = await protectedVisitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaProtected
			);
			expect(response.ok()).toBe(true);
			await expect(
				publicPage.locator(`#jtg-album-${protectedAlbum.id}`)
			).toHaveCount(0);
			await expect(
				publicPage.locator('input[name="post_password"]').first()
			).toBeVisible();
		} finally {
			await evidence.closeVisitor(protectedVisitor);
		}

		await evidence.capture(page, 'album-public-result-protected-inspect');
		testInfo.annotations.push({
			type: 'gap',
			description:
				'Crop derivative URL equality not asserted (medium + crop_images fixture). Editor cell vs Packery geometry compared via placement notice + matching member titles, not pixel coords.',
		});
	});
}
