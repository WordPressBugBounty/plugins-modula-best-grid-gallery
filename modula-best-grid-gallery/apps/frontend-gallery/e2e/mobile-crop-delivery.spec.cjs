const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const gallery = catalog.galleries.mobileCrop;
const attachment = catalog.attachments[8];

async function save(page, action, matches) {
	const saved = page.waitForResponse(
		async (response) =>
			response
				.url()
				.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
			response.status() === 200 &&
			response.request().method() !== 'GET' &&
			matches(await response.json())
	);
	await action();
	await saved;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
}

async function state(root) {
	return root
		.locator('img.pic')
		.first()
		.evaluate((img) => ({
			src: img.src,
			srcset: img.srcset,
			sizes: img.sizes,
			currentSrc: img.currentSrc,
			loaded: img.complete && img.naturalWidth > 0,
			slot: img.getBoundingClientRect().width,
			dpr: devicePixelRatio,
			loading: img.loading,
			sources: [
				...(img.closest('picture')?.querySelectorAll('source') || []),
			].map((source) => source.srcset),
		}));
}

async function pixels(page, bytes) {
	return page.evaluate(async (base64) => {
		const bitmap = await createImageBitmap(
			new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))])
		);
		const canvas = document.createElement('canvas');
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(bitmap, 0, 0);
		return {
			width: bitmap.width,
			height: bitmap.height,
			marker: [
				...ctx.getImageData(
					Math.round(bitmap.width * 0.04),
					Math.round(bitmap.height * 0.5),
					1,
					1
				).data,
			],
		};
	}, bytes.toString('base64'));
}

for (const lazyEnabled of [false, true]) {
	test(`saved 600px crops deliver sharp mobile candidates using native WordPress encoding, lazy ${lazyEnabled}`, async ({
		page,
		evidence,
	}, testInfo) => {
		await page.goto(gallery.editor);
		await page
			.getByRole('button', { name: 'Gallery layout', exact: true })
			.click();
		const layout = page.getByRole('region', {
			name: 'Gallery layout',
			exact: true,
		});
		const medium = layout.getByRole('button', {
			name: 'Medium',
			exact: true,
		});
		if (await medium.count()) {
			await save(
				page,
				async () => {
					await medium.click();
					await layout
						.getByRole('option', { name: 'Custom', exact: true })
						.click();
				},
				(s) => s.layout.gridImageSize === 'custom'
			);
		}
		const customWidth = layout.getByRole('spinbutton', {
			name: 'Width',
			exact: true,
		});
		if ((await customWidth.inputValue()) !== '600')
			await save(
				page,
				() => customWidth.fill('600'),
				(s) => s.layout.gridImageDimensions.width === 600
			);
		const height = layout.getByRole('spinbutton', {
			name: 'Height',
			exact: true,
		});
		if ((await height.inputValue()) !== '600')
			await save(
				page,
				() => height.fill('600'),
				(s) => s.layout.gridImageDimensions.height === 600
			);
		const crop = layout
			.locator('.modula-settings-editor__field-row')
			.filter({ hasText: 'Crop images to fit' })
			.getByRole('switch');
		if (!(await crop.isChecked()))
			await save(
				page,
				() => crop.click(),
				(s) => s.layout.gridImageCrop === true
			);
		await page
			.getByRole('button', {
				name: 'Open Advanced settings',
				exact: true,
			})
			.click();
		await page
			.getByRole('button', { name: 'Performance', exact: true })
			.click();
		const lazy = page
			.getByRole('region', { name: 'Performance', exact: true })
			.locator('.modula-settings-editor__field-row')
			.filter({ hasText: 'Load images as people scroll' })
			.getByRole('switch');
		if ((await lazy.isChecked()) !== lazyEnabled)
			await save(
				page,
				() => lazy.click(),
				(s) => s.performance.lazyLoad === lazyEnabled
			);
		await page.reload();
		await expect(page.locator('main .modula-item').first()).toBeVisible();
		const preview = await state(page.locator('main'));
		await testInfo.attach('saved-preview', {
			body: JSON.stringify({ attachment, preview }, null, 2),
			contentType: 'application/json',
		});
		for (const [width, dpr] of [
			[412, 1.75],
			[390, 2],
			[1350, 1],
		]) {
			const visitor = await evidence.anonymous(
				{ width, height: 1000 },
				{ deviceScaleFactor: dpr }
			);
			let release;
			const held = new Promise((resolve) => {
				release = resolve;
			});
			try {
				const publicPage = await visitor.newPage();
				const requests = [];
				const initiators = [];
				const cdp = await visitor.newCDPSession(publicPage);
				await cdp.send('Network.enable');
				cdp.on('Network.requestWillBeSent', (event) => {
					if (/image-9-(600|640|960|1200)x/.test(event.request.url))
						initiators.push(event);
				});
				if (lazyEnabled)
					await cdp.send('Emulation.setCPUThrottlingRate', {
						rate: 4,
					});
				publicPage.on('request', (r) => {
					if (
						r.resourceType() === 'image' &&
						/image-9-(600|640|960|1200)x/.test(r.url())
					)
						requests.push(r.url());
				});
				await publicPage.route(
					'**/modula-gallery.js*',
					async (route) => {
						await held;
						await route.continue();
					}
				);
				await publicPage.goto(catalog.pages.mobileCrop, {
					waitUntil: 'commit',
				});
				const root = publicPage.locator(`#modula-${gallery.id}`);
				await expect(root.locator('img.pic')).toHaveCount(1);
				if (!lazyEnabled)
					await expect
						.poll(async () => (await state(root)).loaded)
						.toBe(true);
				const initial = await state(root);
				await testInfo.attach('initial-html', {
					body: await publicPage.content(),
					contentType: 'text/html',
				});
				const bootstrap = JSON.parse(
					await publicPage
						.locator('script[data-modula-gallery]')
						.textContent()
				);
				release();
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				await expect
					.poll(async () => (await state(root)).loaded)
					.toBe(true);
				const mounted = await state(root);
				const response = await publicPage.request.get(
					mounted.currentSrc
				);
				const body = await response.body();
				const decoded = await pixels(publicPage, body);
				const reference = attachment.references[decoded.width];
				await testInfo.attach(`crop-${width}-${dpr}`, {
					body: JSON.stringify(
						{
							initial,
							bootstrap,
							mounted,
							decoded,
							requests,
							initiators,
							bytes: body.length,
							contentType: response.headers()['content-type'],
							reference,
						},
						null,
						2
					),
					contentType: 'application/json',
				});
				expect(decoded.width).toBeGreaterThanOrEqual(
					mounted.slot * dpr * 0.9
				);
				expect(decoded.width).toBe(decoded.height);
				expect(decoded.marker[0]).toBeGreaterThan(200);
				expect(decoded.marker[1]).toBeLessThan(65);
				expect(mounted.loading).toBe(lazyEnabled ? 'lazy' : 'eager');
				expect(new Set(requests).size).toBe(1);
				if (initial.loaded)
					expect(initial.currentSrc).toBe(mounted.currentSrc);
				expect(initial.srcset).toBe(mounted.sources[0]);
				expect(bootstrap.items[0].id).toBe(attachment.id);
				expect(bootstrap.settings.layout.gridImageDimensions).toEqual({
					width: 600,
					height: 600,
				});
				expect(bootstrap.settings.layout.gridImageCrop).toBe(true);
				if (dpr > 1) {
					expect(reference).toBeTruthy();
					// Same decoded dimensions/crop as a separately generated native WP image.
					// The budget follows the site's encoder, not a universal byte or JPEG threshold.
					expect(body.length).toBeLessThanOrEqual(
						reference.bytes * 1.02
					);
				}
				await evidence.capture(
					publicPage,
					`mobile-crop-${width}-${dpr}`
				);
			} finally {
				release();
				await evidence.closeVisitor(visitor);
			}
		}
	});
}

// CDN transport only: localhost is not reachable by the provider. Redirect mode
// reproduces the live 307 -> origin contract without inventing CDN compression.
async function cdn(context, delivery) {
	await context.route('https://wp-modula.b-cdn.net/**', async (route) => {
		const url = route.request().url();
		const origin = url.slice(url.indexOf('/http://localhost:10003/') + 1);
		expect(origin).toMatch(
			new RegExp(
				`^http://localhost:10003/wp-content/uploads/${catalog.run}/`
			)
		);
		if (delivery === 'redirect') {
			await route.fulfill({
				status: 307,
				headers: { location: origin },
				body: '',
			});
		} else {
			await route.fulfill({
				response: await route.fetch({ url: origin }),
			});
		}
	});
}

const pro = process.env.MODULA_E2E_MODE === 'pro';
for (const scenario of pro
	? [
			{ optimized: false, lazy: true, delivery: 'origin' },
			{ optimized: true, lazy: false, delivery: 'redirect' },
			{ optimized: true, lazy: true, delivery: 'redirect' },
			{ optimized: true, lazy: true, delivery: 'relay' },
		]
	: [{ optimized: false, lazy: true, delivery: 'origin' }]) {
	test(`600px crop: SpeedUp ${scenario.optimized}, lazy ${scenario.lazy}, ${scenario.delivery} and hidden tab`, async ({
		page,
		context,
		evidence,
	}, testInfo) => {
		await cdn(context, scenario.delivery);
		await page.goto(gallery.editor);
		await page
			.getByRole('button', {
				name: 'Open Advanced settings',
				exact: true,
			})
			.click();
		await page
			.getByRole('button', { name: 'Performance', exact: true })
			.click();
		const panel = page.getByRole('region', {
			name: 'Performance',
			exact: true,
		});
		const row = (label) =>
			panel
				.locator('.modula-settings-editor__field-row')
				.filter({ has: page.getByText(label, { exact: true }) });
		if (pro) {
			const value = scenario.optimized ? 'enabled' : 'disabled';
			const select = row('Use smaller modern image files').getByRole(
				'combobox'
			);
			if ((await select.inputValue()) !== value)
				await save(
					page,
					() => select.selectOption(value),
					(s) => s.performance.enableOptimization === value
				);
		}
		const lazy = row('Load images as people scroll').getByRole('switch');
		if ((await lazy.isChecked()) !== scenario.lazy)
			await save(
				page,
				() => lazy.click(),
				(s) => s.performance.lazyLoad === scenario.lazy
			);
		await page.reload();
		await expect(page.locator('main .modula-item').first()).toBeVisible();
		const preview = await state(page.locator('main'));
		const previewUrl = preview.currentSrc.includes(
			'/http://localhost:10003/'
		)
			? preview.currentSrc.slice(
					preview.currentSrc.indexOf('/http://localhost:10003/') + 1
				)
			: preview.currentSrc;
		const previewPixels = await pixels(
			page,
			await (await page.request.get(previewUrl)).body()
		);
		expect(previewPixels.width).toBe(previewPixels.height);
		expect(previewPixels.marker[0]).toBeGreaterThan(200);
		await testInfo.attach('reopened-preview', {
			body: JSON.stringify({ preview, previewPixels }),
			contentType: 'application/json',
		});
		for (const [width, dpr, hidden] of [
			[1350, 1, false],
			[412, 1.75, false],
			[390, 2, false],
			[390, 2, true],
		]) {
			const visitor = await evidence.anonymous(
				{ width, height: 1000 },
				{ deviceScaleFactor: dpr }
			);
			await cdn(visitor, scenario.delivery);
			try {
				const publicPage = await visitor.newPage();
				const responses = [];
				const pending = [];
				publicPage.on('response', (response) => {
					if (
						response.request().resourceType() !== 'image' ||
						!/image-9-(600|640|960|1200)x/.test(response.url())
					)
						return;
					pending.push(
						(async () => {
							const record = {
								url: response.url(),
								status: response.status(),
								contentType: response.headers()['content-type'],
							};
							responses.push(record);
							if (response.status() === 200) {
								await response.finished();
								record.sizes = await response.request().sizes();
								record.decodedBodyBytes = (
									await response.body()
								).length;
							}
						})()
					);
				});
				await publicPage.goto(
					hidden
						? catalog.pages.mobileCropHidden
						: catalog.pages.mobileCrop
				);
				const root = publicPage.locator(`#modula-${gallery.id}`);
				if (hidden) {
					if (scenario.lazy)
						await expect(root).not.toHaveClass(
							/modula-gallery-initialized/
						);
					await publicPage
						.getByRole('button', {
							name: 'Show crop tab',
							exact: true,
						})
						.click();
				}
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				await expect
					.poll(async () => (await state(root)).loaded)
					.toBe(true);
				const mounted = await state(root);
				expect(mounted.loading).toBe(scenario.lazy ? 'lazy' : 'eager');
				expect(mounted.currentSrc.includes('/spai/q_lossless')).toBe(
					scenario.optimized
				);
				const bootstrap = JSON.parse(
					await publicPage
						.locator('script[data-modula-gallery]')
						.textContent()
				);
				expect(bootstrap.settings.performance.lazyLoad).toBe(
					scenario.lazy
				);
				expect(
					bootstrap.items[0].imgAttributes.src.includes(
						'/spai/q_lossless'
					)
				).toBe(scenario.optimized);
				const origin = mounted.currentSrc.includes(
					'/http://localhost:10003/'
				)
					? mounted.currentSrc.slice(
							mounted.currentSrc.indexOf(
								'/http://localhost:10003/'
							) + 1
						)
					: mounted.currentSrc;
				const body = await (
					await publicPage.request.get(origin)
				).body();
				const decoded = await pixels(publicPage, body);
				expect(decoded.width).toBe(decoded.height);
				expect(decoded.width).toBeGreaterThanOrEqual(
					mounted.slot * dpr * 0.9
				);
				expect(decoded.marker[0]).toBeGreaterThan(200);
				expect(decoded.marker[1]).toBeLessThan(65);
				if (decoded.width > 600)
					expect(body.length).toBeLessThanOrEqual(
						attachment.references[decoded.width].bytes * 1.02
					);
				await publicPage.waitForLoadState('networkidle');
				await Promise.all(pending);
				await testInfo.attach(`delivery-${width}-${dpr}-${hidden}`, {
					body: JSON.stringify(
						{ mounted, decoded, bootstrap, responses },
						null,
						2
					),
					contentType: 'application/json',
				});
				// The zero-body 307 is not a second full-image transfer.
				expect(responses.filter((r) => r.status === 200)).toHaveLength(
					1
				);
				const redirects = responses.filter((r) => r.status === 307);
				// A replacement picture can repeat the empty redirect and reuse the cached body.
				expect(new Set(redirects.map((r) => r.url)).size).toBe(
					scenario.delivery === 'redirect' ? 1 : 0
				);
				expect(redirects.length).toBeLessThanOrEqual(2);
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
	});
}
