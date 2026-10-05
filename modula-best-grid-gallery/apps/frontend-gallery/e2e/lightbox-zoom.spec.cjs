const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const pro = process.env.MODULA_E2E_MODE === 'pro';

async function pinch(page, image) {
	const box = await image.boundingBox();
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;
	const session = await page.context().newCDPSession(page);
	try {
		for (const distance of [20, 35, 50, 70, 90]) {
			await session.send('Input.dispatchTouchEvent', {
				type: distance === 20 ? 'touchStart' : 'touchMove',
				touchPoints: [
					{ x: x - distance, y, id: 1 },
					{ x: x + distance, y, id: 2 },
				],
			});
		}
		await session.send('Input.dispatchTouchEvent', {
			type: 'touchEnd',
			touchPoints: [],
		});
	} finally {
		await session.detach();
	}
}

test('saved lightbox zoom master controls fitted-image gestures without changing hover or navigation', async ({
	page,
	evidence,
}, testInfo) => {
	const gallery = catalog.galleries.farOffscreen;
	await page.goto(gallery.editor);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const original = await page.evaluate(
		(id) =>
			window.wp.apiFetch({ path: `/modula/v2/gallery/${id}/settings` }),
		gallery.id
	);
	const patch = (data) =>
		page.evaluate(
			({ id, data }) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/settings`,
					method: 'PATCH',
					data,
				}),
			{ id: gallery.id, data }
		);
	await patch({
		lightbox: {
			lightbox: 'fancybox',
			toolbar: true,
			zoom: true,
			close: true,
			showNavigation: true,
			showThumbnails: false,
			clickSlide: false,
		},
		...(pro ? { zoom: { enableZoom: true, zoomOnHover: false } } : {}),
	});
	async function openEditor() {
		await page.goto(gallery.editor);
		await page
			.getByRole('button', {
				name: 'Open Lightbox settings',
				exact: true,
			})
			.click();
		await expect(
			page.locator('.modula-gallery-takeover__lightbox-preview-container')
		).toBeVisible();
	}
	const measurements = [];
	for (const enabled of pro ? [false, true] : [true]) {
		await openEditor();
		if (pro) {
			const master = page.getByRole('switch', {
				name: 'Enable lightbox zoom',
				exact: true,
			});
			const saved = page.waitForResponse(
				async (response) =>
					response
						.url()
						.includes(
							`/modula/v2/gallery/${gallery.id}/settings`
						) &&
					(response.request().method() === 'PATCH' ||
						response.request().headers()[
							'x-http-method-override'
						] === 'PATCH') &&
					response.ok() &&
					(await response.json()).zoom?.enableZoom === enabled
			);
			await master.click();
			await saved;
			await expect(
				page.locator('.modula-gallery-takeover__topbar-save-status')
			).toHaveText('Saved');
			await openEditor();
			await expect(master).toHaveAttribute(
				'aria-checked',
				String(enabled)
			);
		}
		const reopened = await page.evaluate(
			(id) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/settings`,
				}),
			gallery.id
		);
		expect(reopened.hover).toEqual(original.hover);
		if (pro) expect(reopened.zoom.enableZoom).toBe(enabled);
		for (const touch of [false, true]) {
			const visitor = await evidence.anonymous(
				{ width: touch ? 700 : 1100, height: 500 },
				{ hasTouch: touch }
			);
			try {
				const publicPage = await visitor.newPage();
				await publicPage.goto(catalog.pages.catalog);
				const root = publicPage.locator(`#modula-${gallery.id}`);
				await root.scrollIntoViewIfNeeded();
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				const trigger = root.locator(
					`.modula-item-link[data-image-id="${catalog.attachments[0].id}"]`
				);
				await trigger[touch ? 'tap' : 'click']();
				const lightbox = publicPage.locator(
					'.modula-fancybox-container'
				);
				await expect(lightbox).toBeVisible();
				const image = lightbox.locator(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				);
				await expect(image).toHaveAttribute('src', /image-1\.jpg/);
				await expect
					.poll(() =>
						image.evaluate(
							(img) => img.complete && img.naturalWidth > 0
						)
					)
					.toBe(true);
				await publicPage.waitForTimeout(500);
				const fitted = await image.evaluate((img) => ({
					width: img.getBoundingClientRect().width,
					natural: img.naturalWidth,
				}));
				expect(fitted.natural).toBeGreaterThan(fitted.width * 1.2);
				await image[touch ? 'tap' : 'click']();
				await publicPage.waitForTimeout(500);
				const clicked = (await image.boundingBox()).width;
				measurements.push({ enabled, touch, fitted, clicked });
				if (enabled) {
					expect(clicked).toBeGreaterThan(fitted.width * 1.2);
				} else {
					expect(Math.abs(clicked - fitted.width)).toBeLessThan(2);
					const more = lightbox.getByRole('button', {
						name: 'More actions',
						exact: true,
					});
					if (await more.count()) await more.click();
					await expect(
						lightbox.locator(
							'[data-panzoom-action="toggleFull"], .modula-fancybox-elevatezoom-button'
						)
					).toHaveCount(0);
					if (await more.count()) await more.click();
					if (touch) {
						await image.tap();
						await image.tap();
						await pinch(publicPage, image);
					} else {
						await image.dblclick();
						await publicPage.keyboard.press('+');
					}
					await publicPage.waitForTimeout(500);
					expect(
						Math.abs(
							(await image.boundingBox()).width - fitted.width
						)
					).toBeLessThan(2);
				}
				if (pro && enabled && !touch) {
					// The add-on keeps its own toggle and produces a visible magnifier.
					const zoomButton = lightbox.locator(
						'.modula-fancybox-elevatezoom-button'
					);
					await zoomButton.click();
					await image.hover();
					await expect(
						lightbox.locator('.modula-native-zoom-window')
					).toBeVisible();
					await zoomButton.click();
					await expect(
						lightbox.locator('.modula-native-zoom-window')
					).toBeHidden();
				}
				await publicPage.keyboard.press('ArrowRight');
				await expect(image).toHaveAttribute('src', /image-2\.jpg/);
				await publicPage.keyboard.press('ArrowLeft');
				await expect(image).toHaveAttribute('src', /image-1\.jpg/);
				await evidence.capture(
					publicPage,
					`zoom-${enabled}-${touch ? 'touch' : 'mouse'}`
				);
				await publicPage.keyboard.press('Escape');
				await expect(lightbox).toHaveCount(0);
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
		// Use the same real saved setting path for close-on-click compatibility.
		await patch({ lightbox: { clickSlide: true } });
		const closeVisitor = await evidence.anonymous({
			width: 700,
			height: 650,
		});
		try {
			const publicPage = await closeVisitor.newPage();
			await publicPage.goto(catalog.pages.catalog);
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await root.scrollIntoViewIfNeeded();
			await root.locator('.modula-item-link').first().click();
			const lightbox = publicPage.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			await lightbox
				.locator('.fancybox__slide.is-selected img:not(.is-clone)')
				.click();
			await expect(lightbox).toHaveCount(0);
		} finally {
			await evidence.closeVisitor(closeVisitor);
		}
		await patch({ lightbox: { clickSlide: false } });
	}
	await testInfo.attach('zoom-geometry', {
		body: JSON.stringify(measurements, null, 2),
		contentType: 'application/json',
	});
});
