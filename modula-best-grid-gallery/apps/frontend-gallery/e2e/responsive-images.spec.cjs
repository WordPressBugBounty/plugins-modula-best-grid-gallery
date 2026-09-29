const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const gallery = catalog.galleries.responsive;
const pro = process.env.MODULA_E2E_MODE === 'pro';

async function performancePanel(page, target = gallery) {
	await page.goto(target.editor);
	await page
		.getByRole('button', { name: 'Open Advanced settings', exact: true })
		.click();
	await page
		.getByRole('button', { name: 'Performance', exact: true })
		.click();
	return page.getByRole('region', { name: 'Performance', exact: true });
}

function field(panel, label) {
	return panel.locator('.modula-settings-editor__field-row').filter({
		has: panel.page().getByText(label, { exact: true }),
	});
}

async function saveChange(page, change, expected, target = gallery) {
	const saved = page.waitForResponse(async (response) => {
		if (
			!response
				.url()
				.includes(`/modula/v2/gallery/${target.id}/settings`) ||
			response.status() !== 200 ||
			(response.request().method() !== 'PATCH' &&
				response.request().headers()['x-http-method-override'] !==
					'PATCH')
		) {
			return false;
		}
		return expected(await response.json());
	});
	await change();
	await saved;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
}

// The external CDN cannot fetch localhost. Only its transport is substituted:
// serve the actual WordPress-generated file named by the real SpeedUp URL.
// HTML, editor saves, plugin hooks and all image selection remain real.
async function localCdn(context) {
	await context.route('https://wp-modula.b-cdn.net/**', async (route) => {
		const url = route.request().url();
		const origin = url.slice(url.indexOf('/http://localhost:10003/') + 1);
		if (
			!origin.startsWith(
				`http://localhost:10003/wp-content/uploads/${catalog.run}/`
			)
		) {
			throw new Error(`Unexpected CDN source: ${url}`);
		}
		const response = await route.fetch({ url: origin });
		await route.fulfill({ response });
	});
}

async function selectedImagePixels(page, selectedUrl) {
	const source = selectedUrl.includes('/http://localhost:10003/')
		? selectedUrl.slice(selectedUrl.indexOf('/http://localhost:10003/') + 1)
		: selectedUrl;
	const response = await page.request.get(source);
	expect(response.ok()).toBe(true);
	const bytes = (await response.body()).toString('base64');
	return page.evaluate(async (encoded) => {
		const data = Uint8Array.from(atob(encoded), (character) =>
			character.charCodeAt(0)
		);
		const bitmap = await createImageBitmap(new Blob([data]));
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const drawing = canvas.getContext('2d');
		drawing.drawImage(bitmap, 0, 0);
		return {
			width: bitmap.width,
			pixel: [
				...drawing.getImageData(
					Math.round(bitmap.width * 0.02),
					Math.round(bitmap.height * 0.5),
					1,
					1
				).data,
			],
		};
	}, bytes);
}

async function imageState(root) {
	return root.locator('img.pic').evaluateAll((images) =>
		images.map((img) => ({
			src: img.src,
			srcset: img.srcset,
			sizes: img.sizes,
			currentSrc: img.currentSrc,
			loading: img.loading,
			loaded: img.complete && img.naturalWidth > 0,
			slot: img.getBoundingClientRect().width,
			sources: [
				...(img.closest('picture')?.querySelectorAll('source') || []),
			].map((source) => source.srcset),
		}))
	);
}

test('saved SpeedUp policy agrees across initial HTML, bootstrap and mounted images', async ({
	page,
	context,
	evidence,
}, testInfo) => {
	await localCdn(context);
	let panel = await performancePanel(page);
	if (!pro) {
		await expect(
			field(panel, 'Use smaller modern image files')
		).toHaveCount(0);
		return;
	}
	await saveChange(
		page,
		async () => {
			await field(panel, 'Use smaller modern image files')
				.getByRole('combobox')
				.selectOption('enabled');
		},
		(settings) => settings.performance.enableOptimization === 'enabled'
	);
	await saveChange(
		page,
		() =>
			field(panel, 'Load images as people scroll')
				.getByRole('switch')
				.click(),
		(settings) => settings.performance.lazyLoad === false
	);
	panel = await performancePanel(page);
	await expect(
		field(panel, 'Use smaller modern image files').getByRole('combobox')
	).toHaveValue('enabled');
	await expect(
		field(panel, 'Load images as people scroll').getByRole('switch')
	).not.toBeChecked();
	await expect(page.locator('main .modula-item').first()).toBeVisible();
	await testInfo.attach('reopened-preview-images', {
		body: JSON.stringify(await imageState(page.locator('main')), null, 2),
		contentType: 'application/json',
	});
	for (const [width, deviceScaleFactor] of [
		[1440, 1],
		[390, 2],
	]) {
		const visitor = await evidence.anonymous(
			{ width, height: 1000 },
			{ deviceScaleFactor }
		);
		await localCdn(visitor);
		let release;
		const holdScripts = new Promise((resolve) => {
			release = resolve;
		});
		try {
			const publicPage = await visitor.newPage();
			const requested = [];
			publicPage.on('request', (request) => {
				if (
					request.resourceType() === 'image' &&
					request.url().includes(catalog.run)
				) {
					requested.push(request.url());
				}
			});
			await publicPage.route('**/modula-gallery.js*', async (route) => {
				await holdScripts;
				await route.continue();
			});
			await publicPage.goto(catalog.pages.responsive, {
				waitUntil: 'commit',
			});
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await expect(root.locator('img.pic')).toHaveCount(6);
			await publicPage.waitForTimeout(1200);
			const initial = await imageState(root);
			const bootstrap = JSON.parse(
				await publicPage
					.locator('script[data-modula-gallery]')
					.textContent()
			);
			release();
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await expect
				.poll(async () =>
					(await imageState(root)).every((img) => img.loaded)
				)
				.toBe(true);
			const mounted = await imageState(root);
			expect(requested.length).toBeGreaterThan(0);
			expect(
				requested.filter(
					(url) => !url.startsWith('https://wp-modula.b-cdn.net/')
				)
			).toEqual([]);
			await testInfo.attach(
				`image-delivery-${width}-${deviceScaleFactor}`,
				{
					body: JSON.stringify(
						{ initial, bootstrap, mounted, requested },
						null,
						2
					),
					contentType: 'application/json',
				}
			);
			for (const img of [...initial, ...mounted]) {
				expect.soft(img.src).toContain('/spai/q_lossless');
				expect
					.soft(img.srcset || img.sources[0])
					.toContain('/spai/q_lossless');
				if (img.currentSrc) {
					expect.soft(img.currentSrc).toContain('/spai/q_lossless');
				}
			}
			await evidence.capture(publicPage, `responsive-${width}`);
		} finally {
			release();
			await evidence.closeVisitor(visitor);
		}
	}
});

test('full-size display uses the current edit and retains the original download', async ({
	page,
	context,
	evidence,
}, testInfo) => {
	const target = catalog.galleries.editedResponsive;
	await localCdn(context);
	if (pro) {
		const performance = await performancePanel(page, target);
		await saveChange(
			page,
			() =>
				field(performance, 'Use smaller modern image files')
					.getByRole('combobox')
					.selectOption('enabled'),
			(settings) => settings.performance.enableOptimization === 'enabled',
			target
		);
	}
	await page.goto(target.editor);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const panel = page.getByRole('region', {
		name: 'Gallery layout',
		exact: true,
	});
	const medium = panel.getByRole('button', { name: /^(Medium|Thumbnail)$/ });
	if (await medium.count()) {
		await saveChange(
			page,
			async () => {
				await medium.click();
				await panel
					.getByRole('option', { name: 'Full', exact: true })
					.click();
			},
			(settings) => settings.layout.gridImageSize === 'full',
			target
		);
	}
	await page.reload();
	await expect(page.locator('main .modula-item').first()).toBeVisible();
	const preview = await imageState(page.locator('main'));
	const visitor = await evidence.anonymous(
		{ width: 390, height: 1000 },
		{ deviceScaleFactor: 2 }
	);
	await localCdn(visitor);
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(catalog.pages.editedResponsive);
		const root = publicPage.locator(`#modula-${target.id}`);
		await expect(root.locator('.modula-masonry-react')).toBeVisible();
		await expect
			.poll(async () => (await imageState(root))[0]?.loaded)
			.toBe(true);
		const mounted = await imageState(root);
		const bootstrap = JSON.parse(
			await publicPage
				.locator('script[data-modula-gallery]')
				.textContent()
		);
		await testInfo.attach('edited-image-delivery', {
			body: JSON.stringify({ preview, mounted, bootstrap }, null, 2),
			contentType: 'application/json',
		});
		for (const img of [preview[0], mounted[0]]) {
			expect.soft(img.src).toContain('image-8-e1234567890123.jpg');
			expect.soft(img.currentSrc).toContain('image-8-e1234567890123');
			expect
				.soft(img.sources.join(' '))
				.not.toContain('image-8-300x225.jpg');
		}
		const attrs = bootstrap.items[0].imgAttributes;
		if (pro) {
			expect(attrs['data-download']).toContain(
				`${catalog.run}/image-8.jpg`
			);
			expect(attrs['data-download']).not.toContain('/spai/');
		}
		await evidence.capture(publicPage, 'edited-image-mobile');
		await page
			.getByRole('button', { name: 'Gallery layout', exact: true })
			.click();
		await saveChange(
			page,
			async () => {
				await panel
					.getByRole('button', { name: 'Full', exact: true })
					.click();
				await panel
					.getByRole('option', { name: 'Thumbnail', exact: true })
					.click();
			},
			(settings) => settings.layout.gridImageSize === 'thumbnail',
			target
		);
		await page.reload();
		await expect(page.locator('main .modula-item').first()).toBeVisible();
		await publicPage.reload();
		await expect
			.poll(async () => (await imageState(root))[0]?.loaded)
			.toBe(true);
		const thumbnail = await imageState(root);
		const thumbnailPreview = await imageState(page.locator('main'));
		await testInfo.attach('thumbnail-only-edit', {
			body: JSON.stringify(
				{ preview: thumbnailPreview, mounted: thumbnail },
				null,
				2
			),
			contentType: 'application/json',
		});
		for (const img of [thumbnailPreview[0], thumbnail[0]]) {
			expect(img.currentSrc).toContain(
				'image-8-e1234567890999-150x150.jpg'
			);
			expect(img.sources.join(' ')).not.toContain('e1234567890123');
		}
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('a selected center crop is preserved in preview and on a high-DPR visitor', async ({
	page,
	context,
	evidence,
}, testInfo) => {
	const target = catalog.galleries.responsiveCrop;
	await localCdn(context);
	if (pro) {
		const performance = await performancePanel(page, target);
		await saveChange(
			page,
			() =>
				field(performance, 'Use smaller modern image files')
					.getByRole('combobox')
					.selectOption('enabled'),
			(settings) => settings.performance.enableOptimization === 'enabled',
			target
		);
	}
	await page.goto(target.editor);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const panel = page.getByRole('region', {
		name: 'Gallery layout',
		exact: true,
	});
	const size = panel.getByRole('button', { name: 'Medium', exact: true });
	if (await size.count()) {
		await saveChange(
			page,
			async () => {
				await size.click();
				await panel
					.getByRole('option', { name: 'Thumbnail', exact: true })
					.click();
			},
			(settings) => settings.layout.gridImageSize === 'thumbnail',
			target
		);
	}
	await page.reload();
	await expect(page.locator('main .modula-item').first()).toBeVisible();
	const preview = await imageState(page.locator('main'));
	const visitor = await evidence.anonymous(
		{ width: 390, height: 1000 },
		{ deviceScaleFactor: 2 }
	);
	await localCdn(visitor);
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(catalog.pages.responsiveCrop);
		const root = publicPage.locator(`#modula-${target.id}`);
		await expect(root.locator('.modula-masonry-react')).toBeVisible();
		const first = root.locator('img.pic').first();
		await expect
			.poll(() =>
				first.evaluate((img) => img.complete && img.naturalWidth > 0)
			)
			.toBe(true);
		const mounted = await imageState(root);
		await testInfo.attach('selected-center-crop', {
			body: JSON.stringify({ preview, mounted }, null, 2),
			contentType: 'application/json',
		});
		for (const img of [preview[0], mounted[0]]) {
			expect(img.sources.join(' ')).not.toContain('300x300');
		}
		const selected = await selectedImagePixels(
			publicPage,
			mounted[0].currentSrc
		);
		// The center crop includes the pale rectangle here; the top-left crop does not.
		expect(selected.pixel[0]).toBeGreaterThan(200);
		expect(selected.width).toBeGreaterThanOrEqual(
			mounted[0].slot * 2 * 0.9
		);
		await evidence.capture(publicPage, 'center-crop-mobile');
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('saved lazy loading and disabled optimization retain responsive origin delivery', async ({
	page,
	context,
	evidence,
}, testInfo) => {
	await localCdn(context);
	const scenarios = pro
		? [
				{
					enabled: 'enabled',
					lazy: true,
					compression: 'lossless',
					lightbox: 'disabled',
				},
				{
					enabled: 'disabled',
					lazy: true,
					compression: 'lossless',
					lightbox: 'disabled',
				},
				{
					enabled: 'disabled',
					lazy: false,
					compression: 'lossless',
					lightbox: 'disabled',
				},
				{
					enabled: 'enabled',
					lazy: false,
					compression: 'disabled',
					lightbox: 'lossless',
				},
			]
		: [{ lazy: false }, { lazy: true }];
	for (const scenario of scenarios) {
		let panel = await performancePanel(page);
		if (pro) {
			for (const [label, key, value] of [
				[
					'Use smaller modern image files',
					'enableOptimization',
					scenario.enabled,
				],
				[
					'Thumbnail compression',
					'thumbnailOptimization',
					scenario.compression,
				],
				[
					'Lightbox compression',
					'lightboxOptimization',
					scenario.lightbox,
				],
			]) {
				if (key === 'enableOptimization') {
					const select = field(panel, label).getByRole('combobox');
					if ((await select.inputValue()) !== value) {
						await saveChange(
							page,
							() => select.selectOption(value),
							(settings) => settings.performance[key] === value
						);
					}
				} else if (scenario.enabled === 'enabled') {
					const text = value === 'disabled' ? 'Off' : 'Lossless';
					const select = field(panel, label).getByRole('button', {
						name: /^(Lossless|Off)$/,
					});
					if ((await select.textContent()) !== text) {
						await saveChange(
							page,
							async () => {
								await select.click();
								await field(panel, label)
									.getByRole('option', {
										name: text,
										exact: true,
									})
									.click();
							},
							(settings) => settings.performance[key] === value
						);
					}
				}
			}
		}
		const lazy = field(panel, 'Load images as people scroll').getByRole(
			'switch'
		);
		if ((await lazy.isChecked()) !== scenario.lazy) {
			await saveChange(
				page,
				() => lazy.click(),
				(settings) => settings.performance.lazyLoad === scenario.lazy
			);
		}
		panel = await performancePanel(page);
		await expect(
			field(panel, 'Load images as people scroll').getByRole('switch')
		).toBeChecked({ checked: scenario.lazy });
		if (pro) {
			await expect(
				field(panel, 'Use smaller modern image files').getByRole(
					'combobox'
				)
			).toHaveValue(scenario.enabled);
			if (scenario.enabled === 'enabled') {
				await expect(
					field(panel, 'Thumbnail compression').getByRole('button', {
						name:
							scenario.compression === 'disabled'
								? 'Off'
								: 'Lossless',
						exact: true,
					})
				).toBeVisible();
			}
		}
		const visitor = await evidence.anonymous(
			{ width: 390, height: 1000 },
			{ deviceScaleFactor: 2 }
		);
		await localCdn(visitor);
		try {
			const publicPage = await visitor.newPage();
			const requests = [];
			publicPage.on('request', (request) => {
				if (
					request.resourceType() === 'image' &&
					request.url().includes(catalog.run)
				) {
					requests.push(request.url());
				}
			});
			await publicPage.goto(catalog.pages.responsive);
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await expect
				.poll(async () => (await imageState(root))[0]?.loaded)
				.toBe(true);
			const images = await imageState(root);
			const optimized =
				pro &&
				scenario.enabled === 'enabled' &&
				scenario.compression !== 'disabled';
			const family = optimized
				? 'https://wp-modula.b-cdn.net/'
				: 'http://localhost:10003/';
			expect(requests.length).toBeGreaterThan(0);
			expect(requests.filter((url) => !url.startsWith(family))).toEqual(
				[]
			);
			expect(images[0].src.startsWith(family)).toBe(true);
			expect(images[0].currentSrc.startsWith(family)).toBe(true);
			expect(images[0].sources[0]).toContain('640w');
			expect(images[0].loading).toBe(scenario.lazy ? 'lazy' : 'eager');
			const selected = Object.values(
				catalog.attachments[0].metadata.sizes
			).find((size) =>
				new URL(images[0].currentSrc).pathname.endsWith('/' + size.file)
			);
			expect(selected.width).toBeGreaterThanOrEqual(
				images[0].slot * 2 * 0.9
			);
			await testInfo.attach(
				`saved-delivery-${scenario.enabled || 'lite'}-${scenario.lazy}-${scenario.compression || 'none'}`,
				{
					body: JSON.stringify(
						{ scenario, images, requests },
						null,
						2
					),
					contentType: 'application/json',
				}
			);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	}
});

if (pro) {
	test('saved Parallax, Slider and BnB keep optimized main-image candidates', async ({
		page,
		context,
		evidence,
	}, testInfo) => {
		const target = catalog.galleries.responsiveCrop;
		await localCdn(context);
		let previous = 'Masonry';
		for (const [title, type] of [
			['Parallax', 'parallax-masonry'],
			['Slider', 'slider'],
			['BnB (hero + grid)', 'bnb'],
		]) {
			await page.goto(target.editor);
			if (type === 'slider') {
				await page
					.getByRole('button', {
						name: 'Gallery layout',
						exact: true,
					})
					.click();
				const layout = page.getByRole('region', {
					name: 'Gallery layout',
					exact: true,
				});
				await saveChange(
					page,
					async () => {
						await layout
							.getByRole('button', {
								name: 'Thumbnail',
								exact: true,
							})
							.click();
						await layout
							.getByRole('option', {
								name: 'Medium',
								exact: true,
							})
							.click();
					},
					(settings) => settings.layout.gridImageSize === 'medium',
					target
				);
				await page.reload();
			}
			await saveChange(
				page,
				async () => {
					await page
						.getByRole('button', { name: previous, exact: true })
						.click();
					await page
						.getByRole('option', { name: title, exact: true })
						.click();
				},
				(settings) => settings.general.type === type,
				target
			);
			await page.reload();
			if (type === 'slider') {
				await page
					.getByRole('button', {
						name: 'Gallery layout',
						exact: true,
					})
					.click();
				const layout = page.getByRole('region', {
					name: 'Gallery layout',
					exact: true,
				});
				await saveChange(
					page,
					async () => {
						await layout
							.getByRole('button', { name: 'Large', exact: true })
							.click();
						await layout
							.getByRole('option', {
								name: 'Thumbnail',
								exact: true,
							})
							.click();
					},
					(settings) => settings.slider.imageSize === 'thumbnail',
					target
				);
				await page.reload();
			}
			await expect(
				page.getByRole('button', { name: title, exact: true })
			).toBeVisible();
			await expect(
				page.locator('main .modula-item').first()
			).toBeVisible();
			const preview = await imageState(page.locator('main'));
			const visitor = await evidence.anonymous(
				{ width: 390, height: 1000 },
				{ deviceScaleFactor: 2 }
			);
			await localCdn(visitor);
			try {
				const publicPage = await visitor.newPage();
				await publicPage.goto(catalog.pages.responsiveCrop);
				const root = publicPage.locator(
					`#modula-${target.id} .modula-gallery-react-host`
				);
				await expect(root.locator('img.pic').first()).toBeVisible();
				await expect
					.poll(async () => (await imageState(root))[0]?.loaded)
					.toBe(true);
				const images = await imageState(root);
				await testInfo.attach(`optimized-${type}`, {
					body: JSON.stringify({ preview, images }, null, 2),
					contentType: 'application/json',
				});
				expect(images[0].currentSrc).toContain('/spai/q_lossless');
				expect(images[0].sources[0]).toContain('/spai/q_lossless');
				const selected = await selectedImagePixels(
					publicPage,
					images[0].currentSrc
				);
				expect(selected.width).toBeGreaterThanOrEqual(
					images[0].slot * 2 * 0.9
				);
				if (type !== 'bnb') {
					expect(selected.pixel[0]).toBeGreaterThan(200);
				}
				await evidence.capture(publicPage, `optimized-${type}`);
			} finally {
				await evidence.closeVisitor(visitor);
			}
			previous = title;
		}
	});
}
