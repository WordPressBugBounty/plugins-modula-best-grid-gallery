const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Albums Slider: Grid→Slider PATCH preserves members/columns; authoring canvas
 * uses explicit Slider strip; public-result inspection and anonymous visitor
 * render a carousel (not Grid). Classic albumSlider smoke stays unchanged.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album slider editor journey', async ({ page }) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album Slider PATCH reopen inspection and anonymous carousel', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaSlider;
		expect(album?.id).toBeTruthy();
		expect(album?.editor).toBeTruthy();
		expect(album?.galleryA).toBeTruthy();
		expect(album?.galleryB).toBeTruthy();
		expect(album?.galleryC).toBeTruthy();

		await page.goto(catalog.galleries.visible.editor);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();

		const beforeMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		const memberIds = (beforeMembers?.members || []).map((row) => row.id);
		expect(memberIds).toEqual([
			album.galleryA,
			album.galleryB,
			album.galleryC,
		]);

		const before = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(before?.general?.albumType).toBe('grid');
		expect(before?.general?.columns).toBe('5');
		expect(before?.layout?.gutter).toBe(12);

		const patched = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					general: {
						albumType: 'slider',
						columns: '5',
					},
					layout: {
						gutter: 12,
					},
					slider: {
						slidesToShow: 1,
						slidesToScroll: 1,
						arrows: true,
						dots: true,
						centerMode: false,
						syncing: true,
						syncingNavSize: 'custom',
						syncingNavImageDimensions: {
							width: 120,
							height: 80,
						},
						syncingNavImageCrop: true,
						syncingNavThumbnailsNumber: 3,
						imageInfo: true,
						imageInfoPosition: 'top_outside',
						initialSlide: 1,
						autoplay: false,
						pauseOnHover: true,
						tabletSlides: 2,
						tabletScrolls: 1,
						mobileSlides: 1,
						mobileScrolls: 1,
						speed: 400,
						rtl: false,
					},
					responsive: {
						enableResponsive: true,
					},
				},
			});
		}, album.id);
		expect(patched?.general?.albumType).toBe('slider');
		expect(patched?.general?.columns).toBe('5');
		expect(patched?.slider?.dots).toBe(true);
		expect(patched?.slider?.imageInfo).toBe(true);
		expect(patched?.slider?.imageInfoPosition).toBe('top_outside');
		expect(patched?.slider?.syncingNavSize).toBe('custom');
		expect(patched?.slider?.syncingNavImageDimensions).toEqual({
			width: 120,
			height: 80,
		});
		expect(patched?.slider?.initialSlide).toBe(1);
		expect(patched?.slider?.tabletSlides).toBe(2);
		expect(patched?.slider?.mobileSlides).toBe(1);

		const reopened = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
			});
		}, album.id);
		expect(reopened?.general?.albumType).toBe('slider');
		expect(reopened?.general?.columns).toBe('5');
		expect(reopened?.layout?.gutter).toBe(12);
		expect(reopened?.slider?.dots).toBe(true);
		expect(reopened?.slider?.imageInfoPosition).toBe('top_outside');
		expect(reopened?.slider?.syncingNavImageDimensions?.width).toBe(120);
		expect(reopened?.slider?.tabletSlides).toBe(2);

		const afterMembers = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		expect((afterMembers?.members || []).map((row) => row.id)).toEqual(
			memberIds
		);

		await page.goto(album.editor);
		await expect(
			page.locator('.modula-album-takeover__shell').first()
		).toBeVisible({ timeout: 60000 });
		await expect(
			page.locator('[data-modula-album-canvas-layout="slider"]')
		).toBeVisible({ timeout: 60000 });
		await expect(
			page.locator('[data-modula-album-canvas-layout="columns"]')
		).toHaveCount(0);
		await expect(
			page.locator('.modula-album-takeover__member-tile')
		).toHaveCount(3);

		const publicResultToggle = page.locator(
			'[data-modula-public-result-toggle="1"]'
		);
		await expect(publicResultToggle).toBeVisible();
		await publicResultToggle.click();

		const frame = page.frameLocator(
			'[data-modula-public-result-frame="1"]'
		);
		const inspectRoot = frame.locator(`#jtg-album-${album.id}`).first();
		await expect(inspectRoot).toBeVisible({ timeout: 60000 });
		await expect(inspectRoot).toHaveClass(/modula-slider/);
		await expect(
			frame.locator('.modula-carousel-nav-wrapp .modula-slider-nav-image')
		).toHaveCount(3, { timeout: 30000 });
		await expect(
			frame.locator('.slider-image-info.top_outside').first()
		).toBeVisible();
		await evidence.capture(page, 'album-slider-public-result');

		const visitor = await evidence.anonymous({ width: 1440, height: 900 });
		try {
			const publicPage = await visitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaSlider
			);
			expect(response.ok()).toBe(true);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible({ timeout: 60000 });
			await expect(albumRoot).toHaveClass(/modula-slider/);
			await expect(
				publicPage.locator(
					'.modula-carousel-nav-wrapp .modula-slider-nav-image'
				)
			).toHaveCount(3, { timeout: 30000 });
			await expect(
				publicPage.locator('.slider-image-info.top_outside').first()
			).toBeVisible();
			await expect(
				publicPage.getByText(album.tileTitle).first()
			).toBeVisible();
			await evidence.capture(publicPage, 'album-slider-visitor-desktop');
		} finally {
			await evidence.closeVisitor(visitor);
		}

		const mobileVisitor = await evidence.anonymous(
			{ width: 390, height: 844 },
			{ deviceScaleFactor: 2 }
		);
		try {
			const publicPage = await mobileVisitor.newPage();
			const response = await publicPage.goto(
				catalog.pages.albumBetaSlider
			);
			expect(response.ok()).toBe(true);
			const albumRoot = publicPage
				.locator(`#jtg-album-${album.id}`)
				.first();
			await expect(albumRoot).toBeVisible({ timeout: 60000 });
			await expect(albumRoot).toHaveClass(/modula-slider/);
			await evidence.capture(publicPage, 'album-slider-visitor-mobile');
		} finally {
			await evidence.closeVisitor(mobileVisitor);
		}

		// Switching back to Grid keeps columns and member order.
		const backToGrid = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/settings`,
				method: 'PATCH',
				data: {
					general: {
						albumType: 'grid',
						columns: '5',
					},
				},
			});
		}, album.id);
		expect(backToGrid?.general?.albumType).toBe('grid');
		expect(backToGrid?.general?.columns).toBe('5');
		expect(backToGrid?.slider?.imageInfoPosition).toBe('top_outside');

		const membersAfterType = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		expect((membersAfterType?.members || []).map((row) => row.id)).toEqual(
			memberIds
		);

		// Classic album Slider smoke remains unchanged.
		const classicVisitor = await evidence.anonymous({
			width: 1440,
			height: 900,
		});
		try {
			const publicPage = await classicVisitor.newPage();
			await publicPage.goto(catalog.pages.albumSlider);
			const thumbs = publicPage.locator(
				'.modula-carousel-nav-wrapp .modula-slider-nav-image'
			);
			await expect(thumbs).toHaveCount(6);
			await evidence.capture(publicPage, 'album-slider-classic-smoke');
		} finally {
			await evidence.closeVisitor(classicVisitor);
		}

		await testInfo.attach('album-slider-settings', {
			body: JSON.stringify(
				{
					reopened,
					memberIds,
				},
				null,
				2
			),
			contentType: 'application/json',
		});
	});
}
