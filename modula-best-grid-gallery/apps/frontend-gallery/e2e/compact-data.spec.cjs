const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

for (const name of [
	'visible',
	'responsiveCrop',
	'editedResponsive',
	'customSlider',
	'lightboxCatalog',
]) {
	test(`Compact Beta data preserves ${name} presentation and records delivery cost`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous();
		const fallback = await evidence.anonymous(undefined, {
			javaScriptEnabled: false,
		});
		try {
			const plain = await fallback.newPage();
			const plainResponse = await plain.goto(catalog.pages[name]);
			const html = await plainResponse.text();
			const rootSelector = `#modula-${catalog.galleries[name].id}`;
			const selector = `script[data-modula-gallery-id="modula-${catalog.galleries[name].id}"]`;
			const raw = await plain.locator(selector).textContent();
			const data = JSON.parse(raw);
			await expect(
				plain.locator(`${rootSelector} .modula-item`).first()
			).toBeVisible();
			const originalPresentation = await plain
				.locator(`${rootSelector} .modula-item`)
				.evaluateAll((elements) =>
					elements.map((el) => ({
						classes: [...el.classList].filter((cls) =>
							cls.startsWith('modula-hover-')
						),
						titleX: getComputedStyle(el).getPropertyValue(
							'--modula-hover-slot-title-x'
						),
						titleY: getComputedStyle(el).getPropertyValue(
							'--modula-hover-slot-title-y'
						),
					}))
				);
			const page = await visitor.newPage();
			const response = await page.goto(catalog.pages[name]);
			await expect(
				page.locator(`${rootSelector}.modula-gallery-initialized`)
			).toBeVisible();
			const tiles = page.locator(`${rootSelector} .modula-item`);
			await expect(tiles.first()).toBeVisible();
			for (const cls of originalPresentation[0].classes) {
				// Slider deliberately strips hover classes in the modern item view model.
				if (name !== 'customSlider') {
					await expect(tiles.first()).toHaveClass(new RegExp(cls));
				}
			}
			if (name !== 'customSlider') {
				await expect
					.poll(() =>
						tiles
							.first()
							.evaluate((el) =>
								getComputedStyle(el).getPropertyValue(
									'--modula-hover-slot-title-x'
								)
							)
					)
					.toBe(originalPresentation[0].titleX);
			}
			// Benchmark the actual public DOM loader, including default expansion.
			await page.addScriptTag({
				type: 'module',
				content:
					fs.readFileSync(
						path.join(
							__dirname,
							'../../gallery-shared/utils/data-loader.js'
						),
						'utf8'
					) + '\nwindow.modulaMeasureLoad = loadGalleryData;',
			});
			await page.waitForFunction(
				() => typeof window.modulaMeasureLoad === 'function'
			);
			const timing = await page.evaluate(
				({
					selector: scriptSelector,
					rootSelector: gallerySelector,
				}) => {
					const script = document.querySelector(scriptSelector);
					const root = document.querySelector(gallerySelector);
					const compact = script.textContent;
					const expanded = JSON.stringify(
						window.modulaMeasureLoad(root)
					);
					function measure(text) {
						script.textContent = text;
						const batches = [];
						for (let batch = 0; batch < 15; batch++) {
							const start = performance.now();
							for (let n = 0; n < 100; n++) {
								window.modulaMeasureLoad(root);
							}
							batches.push((performance.now() - start) / 100);
						}
						return batches.sort((a, b) => a - b)[7];
					}
					const expandedLoaderMedianMs = measure(expanded);
					const compactLoaderMedianMs = measure(compact);
					script.textContent = compact;
					delete window.modulaMeasureLoad;
					return {
						expandedLoaderMedianMs,
						compactLoaderMedianMs,
						navigation: performance
							.getEntriesByType('navigation')[0]
							.toJSON(),
					};
				},
				{ selector, rootSelector }
			);
			await testInfo.attach('measurement.json', {
				body: JSON.stringify({
					fixture: name,
					htmlBytes: Buffer.byteLength(html),
					jsonBytes: Buffer.byteLength(raw),
					contentEncoding:
						response.headers()['content-encoding'] || 'identity',
					...timing,
					sizes: await response.request().sizes(),
				}),
				contentType: 'application/json',
			});
			await testInfo.attach('bootstrap.json', {
				body: raw,
				contentType: 'application/json',
			});
			if (!process.env.MODULA_COMPACT_BASELINE) {
				expect(
					data.items.filter((item) =>
						item.itemAttributes?.style?.includes(
							'--modula-hover-ord-title'
						)
					).length
				).toBeLessThanOrEqual(1);
				if (data.items.length > 1) {
					expect(data.itemDefaults?.itemAttributes?.style).toContain(
						'--modula-hover-ord-title'
					);
				}
			}
			const publicResponse = await visitor.request.get(
				`/wp-json/modula/v2/gallery/${catalog.galleries[name].id}/bootstrap?context=settings_editor`
			);
			expect(publicResponse.ok()).toBe(true);
			const publicData = await publicResponse.json();
			expect(publicData.metadata.displayContext).not.toBe(
				'settings-editor-preview'
			);
			expect(publicData).not.toHaveProperty('itemDefaults');
			const denied = await visitor.request.patch(
				`/wp-json/modula/v2/gallery/${catalog.galleries[name].id}/settings`,
				{ data: {} }
			);
			expect([401, 403]).toContain(denied.status());
		} finally {
			await evidence.closeVisitor(visitor);
			await evidence.closeVisitor(fallback);
		}
	});
}

if (process.env.MODULA_E2E_MODE === 'pro') {
	test('saved pagination and filters retain protected images, EXIF and the download target', async ({
		page,
		evidence,
	}, testInfo) => {
		const gallery = catalog.galleries.compactControls;
		const saveStatus = page.locator(
			'.modula-gallery-takeover__topbar-save-status'
		);
		const save = () =>
			page.waitForResponse(
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
					response.ok()
			);
		const openPages = async () => {
			await page.goto(gallery.editor);
			await page
				.getByRole('button', {
					name: 'Open Layout settings',
					exact: true,
				})
				.click();
			await page
				.getByRole('button', { name: /Page size & navigation/ })
				.click();
		};
		await openPages();
		const count = page
			.getByRole('region', {
				name: 'Page size & navigation',
				exact: true,
			})
			.getByRole('spinbutton')
			.first();
		await expect(count).toHaveValue('2');
		const saved = save();
		await count.fill('3');
		await count.press('Tab');
		await saved;
		await expect(saveStatus).toHaveText('Saved');
		await page
			.getByRole('button', { name: 'Open Layout settings', exact: true })
			.click();
		await page
			.getByRole('button', { name: 'Gallery layout', exact: true })
			.click();
		await expect(page.locator('main .modula-item')).toHaveCount(6);
		await expect(
			page.locator('main .modula-editor-page-break')
		).toHaveCount(1);
		await page
			.getByRole('button', { name: 'Open Filters settings', exact: true })
			.click();
		const showCount = page.getByRole('switch', {
			name: 'Show image count on each filter',
			exact: true,
		});
		await expect(showCount).toBeChecked();
		const filteredSave = save();
		await showCount.click();
		await filteredSave;
		await expect(saveStatus).toHaveText('Saved');
		await openPages();
		await expect(count).toHaveValue('3');
		await page
			.getByRole('button', { name: 'Open Filters settings', exact: true })
			.click();
		await expect(showCount).not.toBeChecked();
		await evidence.capture(page, 'reopened-pagination-and-filters');
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.compactControls);
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await expect(root.locator('.modula-item')).toHaveCount(3);

			const image = root.locator('img.pic').first();
			await expect
				.poll(() =>
					image.evaluate((el) => el.complete && el.naturalWidth > 0)
				)
				.toBe(true);
			await expect(image).toHaveAttribute('src', /\/modula-image\//);
			await root
				.getByRole('button', { name: 'Page 2', exact: true })
				.click();
			await expect(
				root.getByRole('img', { name: 'E2E image 4', exact: true })
			).toBeVisible();
			await root
				.getByRole('button', { name: 'Page 1', exact: true })
				.click();
			await expect(
				root.getByRole('img', { name: 'E2E image 1', exact: true })
			).toBeVisible();
			await root
				.getByRole('link', { name: 'Portrait', exact: true })
				.click();
			await expect(root.locator('.modula-item')).toHaveCount(3);
			await expect(
				root.getByRole('img', { name: 'E2E image 4', exact: true })
			).toBeVisible();
			await root.locator('.modula-item-link').first().click();
			const lightbox = publicPage.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			await expect(lightbox).toContainText('E2E Camera');
			await expect
				.poll(() =>
					lightbox
						.locator(
							'.fancybox__slide.is-selected img:not(.is-clone)'
						)
						.evaluate((el) => el.complete && el.naturalWidth > 0)
				)
				.toBe(true);
			const downloading = publicPage.waitForEvent('download');
			await lightbox.getByTitle('Download', { exact: true }).click();
			const download = await downloading;
			// Verify the actual saved bytes, not just a successful endpoint fetch.
			await testInfo.attach('download-action.json', {
				body: JSON.stringify({
					url: download.url(),
					browserFailure: await download.failure(),
				}),
				contentType: 'application/json',
			});
			expect(await download.failure()).toBeNull();
			const direct = await visitor.request.get(download.url());
			expect(direct.status()).toBe(403);
			const selected = await visitor.request.get(download.url(), {
				headers: { Referer: publicPage.url() },
			});
			expect(selected.ok()).toBe(true);
			expect(selected.headers()['content-type']).toContain('image/jpeg');
			const original = await visitor.request.get(
				catalog.attachments[3].url
			);
			expect(original.ok()).toBe(true);
			const downloadedFile = testInfo.outputPath(
				'protected-download.jpg'
			);
			await download.saveAs(downloadedFile);
			expect(
				fs.readFileSync(downloadedFile).equals(await original.body())
			).toBe(true);
			expect((await selected.body()).equals(await original.body())).toBe(
				true
			);
			const navigationHeaders = {
				Referer: publicPage.url(),
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'navigate',
			};
			const withoutDownload = new URL(download.url());
			withoutDownload.searchParams.delete('dl');
			expect(
				(
					await visitor.request.get(withoutDownload.href, {
						headers: navigationHeaders,
					})
				).status()
			).toBe(403);
			const badSignature = new URL(download.url());
			badSignature.searchParams.set('key', 'invalid');
			expect(
				(
					await visitor.request.get(badSignature.href, {
						headers: navigationHeaders,
					})
				).status()
			).toBe(403);
			const classicMarker = new URL(download.url());
			classicMarker.searchParams.set('dl', 'abcde');
			expect(
				(
					await visitor.request.get(classicMarker.href, {
						headers: navigationHeaders,
					})
				).status()
			).toBe(403);
			expect(
				(
					await visitor.request.get(classicMarker.href, {
						headers: {
							...navigationHeaders,
							'Sec-Fetch-Dest': 'document',
						},
					})
				).ok()
			).toBe(true);
			await evidence.capture(publicPage, 'protected-filtered-lightbox');
			await publicPage.keyboard.press('Escape');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}
