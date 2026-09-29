const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

if (process.env.MODULA_E2E_MODE === 'lite') {
	test('Slider remains gated without Compatible Pro', async ({ page }) => {
		await page.goto(catalog.galleries.visible.editor);
		await page
			.getByRole('button', { name: 'Masonry', exact: true })
			.click();
		await expect(
			page.getByRole('option', { name: /^Slider/ })
		).toBeDisabled();
	});
}

if (process.env.MODULA_E2E_MODE === 'pro') {
	test('custom cropped navigation saves dimensions and keeps high-DPR files sharp', async ({
		page,
		evidence,
	}, testInfo) => {
		const gallery = catalog.galleries.customSlider;
		await page.goto(gallery.editor);
		await page
			.getByRole('button', { name: 'Gallery layout', exact: true })
			.click();
		const panel = page.getByRole('region', {
			name: 'Gallery layout',
			exact: true,
		});
		await panel.getByRole('button', { name: 'Auto', exact: true }).click();
		await panel
			.getByRole('option', { name: 'Custom dimensions', exact: true })
			.click();
		const dimensionsSaved = page.waitForResponse(async (response) => {
			if (
				!response
					.url()
					.includes(`/modula/v2/gallery/${gallery.id}/settings`) ||
				response.status() !== 200
			) {
				return false;
			}
			const settings = await response.json();
			return (
				settings.slider?.syncingNavSize === 'custom' &&
				settings.slider?.syncingNavImageDimensions?.width === 120 &&
				settings.slider?.syncingNavImageDimensions?.height === 80
			);
		});
		await panel
			.getByRole('spinbutton', { name: 'Width', exact: true })
			.fill('120');
		await panel
			.getByRole('spinbutton', { name: 'Height', exact: true })
			.fill('80');
		await dimensionsSaved;
		await expect(
			page.locator('.modula-gallery-takeover__topbar-save-status')
		).toHaveText('Saved');
		const cropSwitch = panel
			.locator('.modula-settings-editor__field-row')
			.filter({ hasText: 'Crop thumbnails to fit' })
			.getByRole('switch');
		const saved = page.waitForResponse(async (response) => {
			if (
				!response
					.url()
					.includes(`/modula/v2/gallery/${gallery.id}/settings`) ||
				response.status() !== 200
			) {
				return false;
			}
			const settings = await response.json();
			return (
				settings.slider?.syncingNavImageCrop === true &&
				settings.slider?.syncingNavImageDimensions?.width === 120 &&
				settings.slider?.syncingNavImageDimensions?.height === 80
			);
		});
		await cropSwitch.click();
		await saved;
		await expect(
			page.locator('.modula-gallery-takeover__topbar-save-status')
		).toHaveText('Saved');
		await expect
			.poll(() =>
				page
					.locator('main .f-thumbs img')
					.first()
					.evaluate((img) => ({
						width: Math.round(img.getBoundingClientRect().width),
						height: Math.round(img.getBoundingClientRect().height),
						loaded: img.complete && img.naturalWidth > 0,
					}))
			)
			.toEqual({ width: 120, height: 80, loaded: true });
		await evidence.capture(page, 'custom-navigation-live-preview');
		await page.reload();
		await page
			.getByRole('button', { name: 'Gallery layout', exact: true })
			.click();
		await expect(
			panel.getByRole('spinbutton', { name: 'Width', exact: true })
		).toHaveValue('120');
		await expect(
			panel.getByRole('spinbutton', { name: 'Height', exact: true })
		).toHaveValue('80');
		await expect
			.poll(() =>
				page
					.locator('main .f-thumbs img')
					.first()
					.evaluate((img) => img.currentSrc)
			)
			.toContain('120x80_c');
		await evidence.capture(page, 'custom-navigation-preview');
		const visitor = await evidence.anonymous(
			{ width: 390, height: 900 },
			{ deviceScaleFactor: 2 }
		);
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.customSlider);
			const thumb = publicPage.locator('.f-thumbs img').first();
			await expect
				.poll(() => thumb.evaluate((img) => img.currentSrc))
				.toContain('240x160_c');
			await testInfo.attach('custom-retina-thumbnail', {
				body: await thumb.evaluate((img) => img.outerHTML),
				contentType: 'text/html',
			});
			await evidence.capture(publicPage, 'custom-navigation-mobile');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});

	test('automatic navigation uses responsive derivatives with pointer, keyboard and touch', async ({
		evidence,
	}, testInfo) => {
		for (const [width, deviceScaleFactor] of [
			[1440, 1],
			[390, 2],
		]) {
			const visitor = await evidence.anonymous(
				{ width, height: 900 },
				{ deviceScaleFactor, hasTouch: width === 390 }
			);
			try {
				const page = await visitor.newPage();
				await page.goto(catalog.pages.slider);
				await page
					.getByRole('button', {
						name: 'Show Slider tab',
						exact: true,
					})
					.click();
				const thumbs = page.locator('.f-thumbs img');
				await expect
					.poll(() => thumbs.count())
					.toBeGreaterThanOrEqual(2);
				await expect
					.poll(() =>
						thumbs.evaluateAll((images) =>
							images.every(
								(img) => img.complete && img.naturalWidth > 0
							)
						)
					)
					.toBe(true);
				const images = await thumbs.evaluateAll((nodes) =>
					nodes.map((img) => ({
						index:
							Number(
								img
									.closest('button')
									.getAttribute('aria-label')
									.split('#')[1]
							) - 1,
						src: img.currentSrc,
						width: img.getBoundingClientRect().width,
						height: img.getBoundingClientRect().height,
						sizes: img.sizes,
					}))
				);
				for (const img of images) {
					const derivative = Object.values(
						catalog.attachments[img.index].metadata.sizes
					).find((size) =>
						new URL(img.src).pathname.endsWith('/' + size.file)
					);
					expect(
						derivative,
						'Navigation must request an available derivative'
					).toBeTruthy();
					const requiredWidth =
						Math.max(img.width, (img.height * 4) / 3) *
						deviceScaleFactor;
					expect(derivative.width).toBeGreaterThanOrEqual(
						requiredWidth * 0.9
					);
					expect(derivative.width).toBeLessThanOrEqual(640);
				}
				const second = page.getByRole('button', {
					name: 'Slide to #2',
					exact: true,
				});
				if (width === 390) {
					await second.tap();
				} else {
					await second.click();
				}
				await expect(
					page.locator(
						`.modula-items .modula-item.is-selected[data-modula-image-id="${catalog.attachments[1].id}"]`
					)
				).toBeVisible();
				const third = page.getByRole('button', {
					name: 'Slide to #3',
					exact: true,
				});
				await third.click({ trial: true });
				await third.press('Enter');
				await expect(
					page.locator(
						`.modula-items .modula-item.is-selected[data-modula-image-id="${catalog.attachments[2].id}"]`
					)
				).toBeVisible();
				// Advance the strip until a formerly virtualized thumbnail is attached.
				await page
					.getByRole('button', { name: 'Slide to #4', exact: true })
					.click();
				const sixth = page.getByRole('button', {
					name: 'Slide to #6',
					exact: true,
				});
				await sixth.click();
				await expect
					.poll(() =>
						sixth
							.locator('img')
							.evaluate(
								(img) => img.complete && img.naturalWidth > 0
							)
					)
					.toBe(true);
				await expect(sixth.locator('img')).toHaveAttribute(
					'data-thumbnail-source',
					'derivative'
				);
				const bootstrap = await page
					.locator('script[data-modula-gallery]')
					.textContent();
				const data = JSON.parse(bootstrap);
				for (const [index, item] of data.items.entries()) {
					expect(new URL(item.url).pathname).toBe(
						new URL(catalog.attachments[index].url).pathname
					);
				}
				await testInfo.attach(
					`responsive-navigation-${width}-${deviceScaleFactor}`,
					{
						body: JSON.stringify(
							{
								images,
								requests: await page.evaluate(() =>
									performance
										.getEntriesByType('resource')
										.filter(
											(entry) =>
												entry.initiatorType === 'img'
										)
										.map((entry) => ({
											url: entry.name,
											bytes: entry.transferSize,
										}))
								),
							},
							null,
							2
						),
						contentType: 'application/json',
					}
				);
				await evidence.capture(
					page,
					`navigation-${width}-${deviceScaleFactor}`
				);
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
	});

	test('classic and album Slider navigation remains unchanged', async ({
		evidence,
	}, testInfo) => {
		for (const name of ['classicSlider', 'albumSlider']) {
			for (const [width, deviceScaleFactor] of [
				[1440, 1],
				[390, 2],
			]) {
				const visitor = await evidence.anonymous(
					{ width, height: 900 },
					{ deviceScaleFactor }
				);
				try {
					const page = await visitor.newPage();
					await page.goto(catalog.pages[name]);
					const thumbs = page.locator(
						'.modula-carousel-nav-wrapp .modula-slider-nav-image'
					);
					await expect(thumbs).toHaveCount(6);
					await thumbs.first().scrollIntoViewIfNeeded();
					await expect
						.poll(() =>
							thumbs
								.first()
								.evaluate(
									(img) =>
										img.complete && img.naturalWidth > 0
								)
						)
						.toBe(true);
					const images = await thumbs.evaluateAll((nodes) =>
						nodes.map((img) => ({
							src: img.currentSrc,
							width: img.getBoundingClientRect().width,
							source: img.dataset.thumbnailSource,
							srcset: img.srcset,
						}))
					);
					for (const img of images) {
						expect(img.source).toBeUndefined();
						expect(img.srcset).toBe('');
						if (img.src) {
							expect(
								catalog.attachments.some(
									(attachment) =>
										new URL(attachment.url).pathname ===
										new URL(img.src).pathname
								)
							).toBe(true);
						}
					}
					await testInfo.attach(
						`${name}-${width}-${deviceScaleFactor}`,
						{
							body: JSON.stringify(images, null, 2),
							contentType: 'application/json',
						}
					);
					await evidence.capture(page, `${name}-${width}`);
				} finally {
					await evidence.closeVisitor(visitor);
				}
			}
		}
	});

	test('missing derivatives and video posters have usable distinct fallbacks; no-JS items remain visible', async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.fallbackSlider);
			await page
				.locator(`#modula-${catalog.galleries.fallbackSlider.id}`)
				.scrollIntoViewIfNeeded();
			const fallback = page.locator('.f-thumbs img').first();
			await expect(fallback).toHaveAttribute(
				'data-thumbnail-source',
				'original-fallback'
			);
			await expect
				.poll(() =>
					fallback.evaluate(
						(img) => img.complete && img.naturalWidth > 0
					)
				)
				.toBe(true);
			expect(
				new URL(await fallback.evaluate((img) => img.currentSrc))
					.pathname
			).toBe(new URL(catalog.attachments[6].url).pathname);
			await testInfo.attach('original-fallback', {
				body: await fallback.evaluate((img) => img.outerHTML),
				contentType: 'text/html',
			});
			await page.goto(catalog.pages.videoSlider);
			await page
				.locator(`#modula-${catalog.galleries.videoSlider.id}`)
				.scrollIntoViewIfNeeded();
			await expect(page.locator('.f-thumbs img')).toHaveCount(6);
			const poster = page.locator('.f-thumbs img').first();
			await poster.scrollIntoViewIfNeeded();
			await expect(poster).toHaveAttribute(
				'data-thumbnail-source',
				'derivative'
			);
			await expect
				.poll(() =>
					poster.evaluate(
						(img) => img.complete && img.naturalWidth > 0
					)
				)
				.toBe(true);
			await evidence.capture(page, 'video-poster-fallback');
		} finally {
			await evidence.closeVisitor(visitor);
		}
		const noJs = await evidence.anonymous(
			{ width: 1440, height: 900 },
			{ javaScriptEnabled: false }
		);
		try {
			const page = await noJs.newPage();
			await page.goto(catalog.pages.fallbackSlider);
			const images = page.locator('.modula-items img');
			await expect(images).toHaveCount(2);
			await images.first().scrollIntoViewIfNeeded();
			await expect(images.first()).toBeVisible();
			await expect
				.poll(() =>
					images
						.first()
						.evaluate((img) => img.complete && img.naturalWidth > 0)
				)
				.toBe(true);
			await evidence.capture(page, 'no-javascript-slider-items');
		} finally {
			await evidence.closeVisitor(noJs);
		}
	});

	test('Slider navigation file choices survive preview, save, reopen and visitor activation', async ({
		page,
		evidence,
	}, testInfo) => {
		const gallery = catalog.galleries.hiddenSlider;
		await page.goto(gallery.editor);
		await page
			.getByRole('button', { name: 'Gallery layout', exact: true })
			.click();
		for (const [previous, choice, value, pattern] of [
			['Auto', 'Thumbnail', 'thumbnail', '-150x150'],
			['Thumbnail', 'Auto', 'auto', '-155x116'],
		]) {
			const saved = page.waitForResponse(
				(response) =>
					response
						.url()
						.includes(
							`/modula/v2/gallery/${gallery.id}/settings`
						) &&
					(response.request().method() === 'PATCH' ||
						response.request().headers()[
							'x-http-method-override'
						] === 'PATCH') &&
					response.status() === 200
			);
			await page
				.getByRole('region', { name: 'Gallery layout', exact: true })
				.getByRole('button', { name: previous, exact: true })
				.click();
			await page
				.getByRole('region', { name: 'Gallery layout', exact: true })
				.getByRole('option', { name: choice, exact: true })
				.click();
			expect((await (await saved).json()).slider.syncingNavSize).toBe(
				value
			);
			await expect(
				page.locator('.modula-gallery-takeover__topbar-save-status')
			).toHaveText('Saved');
			await expect
				.poll(() =>
					page
						.locator('main .f-thumbs img')
						.first()
						.evaluate((img) => img.currentSrc)
				)
				.toContain(pattern);
			await evidence.capture(page, `preview-${value}`);
			await page.reload();
			await page
				.getByRole('button', { name: 'Gallery layout', exact: true })
				.click();
			await expect(
				page
					.getByRole('region', {
						name: 'Gallery layout',
						exact: true,
					})
					.getByRole('button', { name: choice, exact: true })
			).toBeVisible();
			const visitor = await evidence.anonymous(
				{ width: 1440, height: 900 },
				{ deviceScaleFactor: value === 'thumbnail' ? 2 : 1 }
			);
			try {
				const publicPage = await visitor.newPage();
				await publicPage.goto(catalog.pages.slider);
				await publicPage
					.getByRole('button', {
						name: 'Show Slider tab',
						exact: true,
					})
					.click();
				const thumbs = publicPage.locator('.f-thumbs img');
				await expect(thumbs).toHaveCount(6);
				await expect
					.poll(() =>
						thumbs.first().evaluate((img) => img.currentSrc)
					)
					.toContain(pattern);
				await evidence.capture(publicPage, `visitor-${value}`);
				await testInfo.attach(`mounted-navigation-${value}`, {
					body: JSON.stringify(
						await thumbs.evaluateAll((images) =>
							images.map((img) => ({
								src: img.currentSrc,
								width: img.getBoundingClientRect().width,
								height: img.getBoundingClientRect().height,
							}))
						)
					),
					contentType: 'application/json',
				});
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
	});

	test('Beta Slider initial HTML does not download original navigation images', async ({
		evidence,
	}, testInfo) => {
		for (const [width, deviceScaleFactor] of [
			[1440, 1],
			[390, 2],
		]) {
			const visitor = await evidence.anonymous(
				{ width, height: 900 },
				{ deviceScaleFactor }
			);
			try {
				const page = await visitor.newPage();
				// Isolate the initial HTML from runtime mounting, including ticket 04's timeout.
				await page.route('**/*.js?*', (route) => route.abort());
				await page.route('**/*.js', (route) => route.abort());
				await page.goto(catalog.pages.slider);
				await page.waitForLoadState('networkidle');
				const requests = await page.evaluate(() =>
					performance
						.getEntriesByType('resource')
						.filter((entry) => entry.initiatorType === 'img')
						.map((entry) => ({
							url: entry.name,
							bytes: entry.transferSize,
						}))
				);
				await testInfo.attach(
					`initial-thumbnail-requests-${width}-${deviceScaleFactor}`,
					{
						body: JSON.stringify(
							{ width, deviceScaleFactor, requests },
							null,
							2
						),
						contentType: 'application/json',
					}
				);
				expect
					.soft(
						requests.filter((request) =>
							catalog.attachments.some(
								(attachment) =>
									new URL(request.url).pathname ===
									new URL(attachment.url).pathname
							)
						)
					)
					.toEqual([]);
				await expect
					.soft(page.locator('.modula-carousel-nav'))
					.toHaveCount(0);
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
	});
}
