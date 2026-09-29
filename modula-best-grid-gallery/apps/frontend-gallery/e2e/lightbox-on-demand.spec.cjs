const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

function imageLink(root, index) {
	return root.locator(
		`.modula-item-link[data-image-id="${catalog.attachments[index].id}"]`
	);
}

/**
 * Count thumbnail buttons that intersect the real strip viewport (not merely
 * present in the DOM). Broken host `:root` scoping yields one full-width slide.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ visible: number, rendered: number, clipWidth: number }>}
 */
async function thumbStripGeometry(page) {
	return page.evaluate(() => {
		const strip =
			document.querySelector(
				'.modula-fancybox-container .fancybox__thumbs'
			) ||
			document.querySelector(
				'.modula-fancybox-container [data-modula-thumbs-sidebar]'
			) ||
			document.querySelector(
				'.modula-fancybox-container .fancybox__sidebar.left, .modula-fancybox-container .fancybox__sidebar.right'
			);
		if (!strip) {
			return { visible: 0, rendered: 0, clipWidth: 0 };
		}
		const stripBox = strip.getBoundingClientRect();
		const thumbs = [
			...strip.querySelectorAll(
				'button[aria-label^="Slide to #"], .f-thumbs__slide button, .f-thumbs__slide, a[data-index], button.f-button'
			),
		].filter((el, index, list) => list.indexOf(el) === index);
		const visible = thumbs.filter((thumb) => {
			const box = thumb.getBoundingClientRect();
			return (
				box.width > 0 &&
				box.height > 0 &&
				box.right > stripBox.left &&
				box.left < stripBox.right &&
				box.bottom > stripBox.top &&
				box.top < stripBox.bottom
			);
		}).length;
		const sample = thumbs[0];
		const clipWidth = sample
			? parseFloat(
					getComputedStyle(sample).getPropertyValue(
						'--f-thumb-clip-width'
					)
				) || Math.min(sample.getBoundingClientRect().width, sample.getBoundingClientRect().height)
			: 0;
		return { visible, rendered: thumbs.length, clipWidth };
	});
}

for (const width of [1440, 390]) {
	test(`a mounted gallery defers its lightbox until the first selected image action at ${width}px`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous(
			{ width, height: 1000 },
			{ hasTouch: width === 390 }
		);
		try {
			const page = await visitor.newPage();
			const requests = [];
			page.on('request', (request) => {
				if (/modula-gallery.*\.(js|css)/.test(request.url())) {
					requests.push(request.url());
				}
			});
			await page.goto(catalog.pages.catalog);
			const root = page.locator(
				`#modula-${catalog.galleries.farOffscreen.id}`
			);
			await root.scrollIntoViewIfNeeded();
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await page.waitForTimeout(500);
			const navigation = requests.slice();
			await testInfo.attach('navigation-requests', {
				body: JSON.stringify(navigation, null, 2),
				contentType: 'application/json',
			});
			expect(
				await page.evaluate(() => typeof window.ModulaFancybox)
			).toBe('undefined');
			const trigger = root.locator(
				`.modula-item-link[data-image-id="${catalog.attachments[2].id}"]`
			);
			await trigger[width === 390 ? 'tap' : 'click']();
			const lightbox = page.locator('.modula-fancybox-container');
			await expect(lightbox).toHaveCount(1);
			await expect(lightbox).toBeVisible();
			await expect(
				lightbox.locator(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				)
			).toHaveAttribute('src', /image-3\.jpg/);
			expect(requests.length).toBeGreaterThan(navigation.length);
			await testInfo.attach('first-open-requests', {
				body: JSON.stringify(
					requests.slice(navigation.length),
					null,
					2
				),
				contentType: 'application/json',
			});
			await page.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
			const opened = requests.length;
			await root.locator('.modula-item-link').nth(1).click();
			await expect(lightbox).toBeVisible();
			expect(requests).toHaveLength(opened);
			await page.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

test('a failed lightbox download retries the original selected item', async ({
	evidence,
}) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.catalog);
		const root = page.locator(
			`#modula-${catalog.galleries.farOffscreen.id}`
		);
		await root.scrollIntoViewIfNeeded();
		await expect(root.locator('.modula-masonry-react')).toBeVisible();
		let failedUrl;
		const attempts = [];
		await page.route('**/assets/js/front/*.modula-gallery.js', (route) => {
			const url = route.request().url();
			attempts.push(url);
			if (!failedUrl) {
				failedUrl = url;
				return route.abort('failed');
			}
			return route.continue();
		});
		await root
			.locator(
				` .modula-item-link[data-image-id="${catalog.attachments[2].id}"]`
			)
			.click();
		const retry = root.getByRole('button', { name: 'Retry lightbox' });
		await expect(retry).toBeVisible();
		await retry.click();
		const lightbox = page.locator('.modula-fancybox-container');
		await expect(lightbox).toBeVisible();
		await expect(
			lightbox.locator('.fancybox__slide.is-selected img:not(.is-clone)')
		).toHaveAttribute('src', /image-3\.jpg/);
		expect(attempts.filter((url) => url === failedUrl)).toHaveLength(2);
		await expect(retry).toHaveCount(0);
		await page.keyboard.press('Escape');
		await expect(lightbox).toHaveCount(0);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

for (const destroy of [false, true]) {
	test(`a pending keyboard lightbox action ${destroy ? 'is cancelled by gallery destruction' : 'preserves selection and restores focus'}`, async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous();
		let release;
		const held = new Promise((resolve) => {
			release = resolve;
		});
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.catalog);
			const root = page.locator(
				`#modula-${catalog.galleries.farOffscreen.id}`
			);
			await root.scrollIntoViewIfNeeded();
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			let attempts = 0;
			await page.route(
				'**/assets/js/front/*.modula-gallery.js',
				async (route) => {
					attempts++;
					await held;
					await route.continue();
				}
			);
			const trigger = imageLink(root, 2);
			await trigger.focus();
			await trigger.press('Enter');
			await expect.poll(() => attempts).toBeGreaterThan(0);
			if (destroy) {
				await page.evaluate(
					(id) => window.ModulaGalleryDestroy(id),
					`modula-${catalog.galleries.farOffscreen.id}`
				);
			} else {
				await imageLink(root, 1).press('Enter');
			}
			release();
			const lightbox = page.locator('.modula-fancybox-container');
			if (destroy) {
				await page.waitForTimeout(750);
				await expect(lightbox).toHaveCount(0);
				await expect(root).not.toHaveClass(
					/modula-gallery-initialized/
				);
			} else {
				await expect(lightbox).toHaveCount(1);
				await expect(
					lightbox.locator(
						'.fancybox__slide.is-selected img:not(.is-clone)'
					)
				).toHaveAttribute('src', /image-3\.jpg/);
				await page.keyboard.press('Escape');
				await expect(lightbox).toHaveCount(0);
				await expect(trigger).toBeFocused();
			}
			expect(attempts).toBeGreaterThan(0);
		} finally {
			release();
			await evidence.closeVisitor(visitor);
		}
	});
}

test('lightbox settings save and reopen, and the preview releases focus for further edits', async ({
	page,
	evidence,
}) => {
	const gallery = catalog.galleries.farOffscreen;
	const preview = page.locator(
		'.modula-gallery-takeover__lightbox-preview-container'
	);
	async function openEditor() {
		await page.goto(gallery.editor);
		await page
			.getByRole('button', {
				name: 'Open Lightbox settings',
				exact: true,
			})
			.click();
		await expect(preview).toBeVisible();
	}
	async function saveArrows(enabled) {
		const saved = page.waitForResponse(
			async (response) =>
				response
					.url()
					.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
				(response.request().method() === 'PATCH' ||
					response.request().headers()['x-http-method-override'] ===
						'PATCH') &&
				response.ok() &&
				(await response.json()).lightbox.showNavigation === enabled
		);
		await page
			.getByRole('switch', { name: 'Prev and next arrows', exact: true })
			.click();
		await saved;
		await expect(
			page.locator('.modula-gallery-takeover__topbar-save-status')
		).toHaveText('Saved');
	}
	await openEditor();
	for (const enabled of [false, true]) {
		await saveArrows(enabled);
		await openEditor();
		await expect(
			page.getByRole('switch', {
				name: 'Prev and next arrows',
				exact: true,
			})
		).toHaveAttribute('aria-checked', String(enabled));
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.catalog);
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await root.scrollIntoViewIfNeeded();
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await imageLink(root, 2).click();
			const lightbox = publicPage.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			await expect(
				lightbox.locator(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				)
			).toHaveAttribute('src', /image-3\.jpg/);
			await expect(
				lightbox.locator('.fancybox__carousel .is-arrow')
			).toHaveCount(enabled ? 2 : 0);
			await evidence.capture(
				publicPage,
				`saved-lightbox-arrows-${enabled}`
			);
			await publicPage.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	}
	await evidence.capture(page, 'lightbox-editor-preview');
	const layout = page.getByRole('button', {
		name: 'Open Layout settings',
		exact: true,
	});
	await layout.focus();
	await layout.press('Enter');
	await expect(preview).toHaveCount(0);
	await expect(layout).toBeFocused();
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const gutter = page.getByRole('spinbutton', { name: 'Value', exact: true });
	const starting = await gutter.inputValue();
	const next = starting === '20' ? '24' : '20';
	await gutter.fill(next);
	await gutter.press('Tab');
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
	await expect(page.locator('main .modula-masonry-react')).toHaveCSS(
		'gap',
		`${next}px`
	);
	await evidence.capture(
		page,
		'preview-after-lightbox-close-and-layout-edit'
	);
});

for (const width of [1440, 390]) {
	test(`the lightbox thumbnail strip shows multiple navigable thumbs at ${width}px`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous(
			{ width, height: 1000 },
			{ hasTouch: width === 390 }
		);
		try {
			const page = await visitor.newPage();
			const requests = [];
			page.on('request', (request) => {
				if (/modula-gallery.*\.(js|css)/.test(request.url())) {
					requests.push(request.url());
				}
			});
			await page.goto(catalog.pages.catalog);
			const root = page.locator(
				`#modula-${catalog.galleries.farOffscreen.id}`
			);
			await root.scrollIntoViewIfNeeded();
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await page.waitForTimeout(500);
			const navigation = requests.slice();
			expect(
				await page.evaluate(() => typeof window.ModulaFancybox)
			).toBe('undefined');
			await imageLink(root, 0)[width === 390 ? 'tap' : 'click']();
			const lightbox = page.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			expect(requests.length).toBeGreaterThan(navigation.length);
			await expect
				.poll(async () => (await thumbStripGeometry(page)).visible)
				.toBeGreaterThan(1);
			const cold = await thumbStripGeometry(page);
			await testInfo.attach(`thumb-strip-cold-${width}`, {
				body: JSON.stringify(cold, null, 2),
				contentType: 'application/json',
			});
			expect(cold.rendered).toBeGreaterThan(1);
			expect(cold.clipWidth).toBeGreaterThan(0);
			expect(cold.clipWidth).toBeLessThan(width * 0.5);
			// Adjacent thumbs stay in the strip viewport; prove selection syncs
			// without relying on overflow scroll (covered by rendered > visible).
			const second = lightbox.getByRole('button', {
				name: 'Slide to #2',
				exact: true,
			});
			await second[width === 390 ? 'tap' : 'click']();
			await expect(
				lightbox.locator(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				)
			).toHaveAttribute('src', /image-2\.jpg/);
			const first = lightbox.getByRole('button', {
				name: 'Slide to #1',
				exact: true,
			});
			await first[width === 390 ? 'tap' : 'click']();
			await expect(
				lightbox.locator(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				)
			).toHaveAttribute('src', /image-1\.jpg/);
			if (width === 390) {
				expect(cold.rendered).toBeGreaterThan(cold.visible);
			} else {
				const fifth = lightbox.getByRole('button', {
					name: 'Slide to #5',
					exact: true,
				});
				await fifth.evaluate((button) => {
					button.scrollIntoView({
						inline: 'center',
						block: 'nearest',
					});
					button.click();
				});
				await expect(
					lightbox.locator(
						'.fancybox__slide.is-selected img:not(.is-clone)'
					)
				).toHaveAttribute('src', /image-5\.jpg/);
				await first.evaluate((button) => {
					button.scrollIntoView({
						inline: 'center',
						block: 'nearest',
					});
					button.click();
				});
				await expect(
					lightbox.locator(
						'.fancybox__slide.is-selected img:not(.is-clone)'
					)
				).toHaveAttribute('src', /image-1\.jpg/);
			}
			await page.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
			const opened = requests.length;
			await imageLink(root, 0).click();
			await expect(lightbox).toBeVisible();
			expect(requests).toHaveLength(opened);
			await expect
				.poll(async () => (await thumbStripGeometry(page)).visible)
				.toBeGreaterThan(1);
			const warm = await thumbStripGeometry(page);
			await testInfo.attach(`thumb-strip-warm-${width}`, {
				body: JSON.stringify(warm, null, 2),
				contentType: 'application/json',
			});
			await evidence.capture(page, `thumb-strip-${width}`);
			await page.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

test('left thumbnail position stays usable on desktop and keeps mobile lightbox intact', async ({
	page,
	evidence,
}) => {
	const gallery = catalog.galleries.farOffscreen;
	await page.goto(gallery.editor);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const patched = await page.evaluate(async (galleryId) => {
		const result = await window.wp.apiFetch({
			path: `/modula/v2/gallery/${galleryId}/settings`,
			method: 'PATCH',
			data: {
				lightbox: {
					showThumbnails: true,
					thumbsPosition: 'left',
				},
			},
		});
		return result?.lightbox?.thumbsPosition;
	}, gallery.id);
	expect(patched).toBe('left');

	const visitorDesktop = await evidence.anonymous({
		width: 1440,
		height: 1000,
	});
	try {
		const publicPage = await visitorDesktop.newPage();
		await publicPage.goto(catalog.pages.catalog);
		const root = publicPage.locator(`#modula-${gallery.id}`);
		await root.scrollIntoViewIfNeeded();
		await imageLink(root, 0).click();
		const lightbox = publicPage.locator('.modula-fancybox-container');
		await expect(lightbox).toBeVisible();
		const sidebar = lightbox.locator(
			'[data-modula-thumbs-sidebar="left"], .fancybox__sidebar.left'
		);
		await expect(sidebar).toBeVisible();
		await expect
			.poll(async () => (await thumbStripGeometry(publicPage)).visible)
			.toBeGreaterThan(1);
		await lightbox
			.getByRole('button', { name: 'Slide to #2', exact: true })
			.click();
		await expect(
			lightbox.locator(
				'.fancybox__slide.is-selected img:not(.is-clone)'
			)
		).toHaveAttribute('src', /image-2\.jpg/);
		await evidence.capture(publicPage, 'thumb-strip-left-desktop');
		await publicPage.keyboard.press('Escape');
	} finally {
		await evidence.closeVisitor(visitorDesktop);
	}

		const visitorMobile = await evidence.anonymous(
			{ width: 390, height: 1000 },
			{ hasTouch: true }
		);
		try {
			const publicPage = await visitorMobile.newPage();
			await publicPage.goto(catalog.pages.catalog);
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await root.scrollIntoViewIfNeeded();
			await imageLink(root, 0).tap();
			const lightbox = publicPage.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			// Narrow viewport must not keep a left sidebar strip (overlaps media/nav).
			await expect(
				lightbox.locator('[data-modula-thumbs-sidebar="left"]')
			).toHaveCount(0);
			await expect(
				lightbox.locator('.fancybox__sidebar.left')
			).toHaveCount(0);
			const geometry = await publicPage.evaluate(() => {
				const container = document.querySelector(
					'.modula-fancybox-container'
				);
				const slide = container?.querySelector(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				);
				const prev = container?.querySelector(
					'.f-button.is-arrow.is-prev'
				);
				const box = container?.getBoundingClientRect();
				const slideBox = slide?.getBoundingClientRect();
				const prevBox = prev?.getBoundingClientRect();
				const strip = container?.querySelector(
					'.fancybox__thumbs, .f-thumbs'
				);
				const stripBox = strip?.getBoundingClientRect();
				const overlaps = (a, b) =>
					!!a &&
					!!b &&
					a.right > b.left &&
					a.left < b.right &&
					a.bottom > b.top &&
					a.top < b.bottom;
				return {
					containerTop: box?.top ?? -1,
					containerHeight: box?.height ?? 0,
					viewportHeight: window.innerHeight,
					slideInContainer:
						!!slideBox &&
						!!box &&
						slideBox.top >= box.top - 1 &&
						slideBox.bottom <= box.bottom + 1,
					stripOverlapsSlide: overlaps(stripBox, slideBox),
					stripOverlapsPrev: overlaps(stripBox, prevBox),
					bottomStrip:
						!!stripBox &&
						!!box &&
						stripBox.top > (box.top + box.height) * 0.55,
				};
			});
			expect(geometry.containerTop).toBeLessThanOrEqual(1);
			expect(geometry.containerHeight).toBeGreaterThan(
				geometry.viewportHeight * 0.8
			);
			expect(geometry.slideInContainer).toBe(true);
			expect(geometry.stripOverlapsSlide).toBe(false);
			expect(geometry.stripOverlapsPrev).toBe(false);
			expect(geometry.bottomStrip).toBe(true);
			await expect
				.poll(async () => (await thumbStripGeometry(publicPage)).visible)
				.toBeGreaterThan(1);
			await expect(
				lightbox.locator(
					'.fancybox__slide.is-selected img:not(.is-clone)'
				)
			).toBeVisible();
			await evidence.capture(publicPage, 'thumb-strip-left-mobile');
			await publicPage.keyboard.press('Escape');
		} finally {
			await evidence.closeVisitor(visitorMobile);
		}

	await page.evaluate(async (galleryId) => {
		await window.wp.apiFetch({
			path: `/modula/v2/gallery/${galleryId}/settings`,
			method: 'PATCH',
			data: {
				lightbox: {
					showThumbnails: true,
					thumbsPosition: 'bottom',
				},
			},
		});
	}, gallery.id);
});

if (process.env.MODULA_E2E_MODE === 'pro') {
	test('thumbnail strip setting saves, reopens, and respects off on the public page', async ({
		page,
		evidence,
	}) => {
		const gallery = catalog.galleries.farOffscreen;
		const preview = page.locator(
			'.modula-gallery-takeover__lightbox-preview-container'
		);
		async function openEditor() {
			await page.goto(gallery.editor);
			await page
				.getByRole('button', {
					name: 'Open Lightbox settings',
					exact: true,
				})
				.click();
			await expect(preview).toBeVisible();
		}
		async function saveThumbnails(enabled) {
			const toggle = page.getByRole('switch', {
				name: 'Show thumbnail strip',
				exact: true,
			});
			const current = await toggle.getAttribute('aria-checked');
			if (current === String(enabled)) {
				return;
			}
			const saved = page.waitForResponse(
				async (response) =>
					response
						.url()
						.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
					(response.request().method() === 'PATCH' ||
						response.request().headers()[
							'x-http-method-override'
						] === 'PATCH') &&
					response.ok() &&
					(await response.json()).lightbox.showThumbnails === enabled
			);
			await toggle.click();
			await saved;
			await expect(
				page.locator('.modula-gallery-takeover__topbar-save-status')
			).toHaveText('Saved');
		}
		await openEditor();
		for (const enabled of [false, true]) {
			await saveThumbnails(enabled);
			await openEditor();
			await expect(
				page.getByRole('switch', {
					name: 'Show thumbnail strip',
					exact: true,
				})
			).toHaveAttribute('aria-checked', String(enabled));
			const visitor = await evidence.anonymous();
			try {
				const publicPage = await visitor.newPage();
				await publicPage.goto(catalog.pages.catalog);
				const root = publicPage.locator(`#modula-${gallery.id}`);
				await root.scrollIntoViewIfNeeded();
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				await imageLink(root, 0).click();
				const lightbox = publicPage.locator(
					'.modula-fancybox-container'
				);
				await expect(lightbox).toBeVisible();
				if (enabled) {
					await expect
						.poll(
							async () =>
								(await thumbStripGeometry(publicPage)).visible
						)
						.toBeGreaterThan(1);
				} else {
					await expect(
						lightbox.locator('.fancybox__thumbs')
					).toHaveCount(0);
				}
				await evidence.capture(
					publicPage,
					`saved-lightbox-thumbs-${enabled}`
				);
				await publicPage.keyboard.press('Escape');
				await expect(lightbox).toHaveCount(0);
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
	});

	test('thumbnail strip geometry holds with comments open and closed', async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous({ width: 1440, height: 1000 });
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.comments);
			const root = page.locator(
				`#modula-${catalog.galleries.farOffscreen.id}`
			);
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await imageLink(root, 0).click();
			const lightbox = page.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			await expect(page.locator('.modula-comments-header')).toBeVisible();
			await expect
				.poll(async () => (await thumbStripGeometry(page)).visible)
				.toBeGreaterThan(1);
			const openGeom = await thumbStripGeometry(page);
			expect(openGeom.clipWidth).toBeLessThan(400);
			const toggle = page.locator('#modula-comments-toggle');
			if (await toggle.count()) {
				await toggle.click();
			}
			await expect
				.poll(async () => (await thumbStripGeometry(page)).visible)
				.toBeGreaterThan(1);
			const closedGeom = await thumbStripGeometry(page);
			expect(closedGeom.clipWidth).toBeLessThan(400);
			await evidence.capture(page, 'thumb-strip-comments');
			await page.keyboard.press('Escape');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});

	for (const destroy of [false, true]) {
		test(`a deeplink waiting for its full catalog ${destroy ? 'cannot reopen a destroyed gallery' : 'opens the selected off-page image'}`, async ({
			evidence,
		}) => {
			const visitor = await evidence.anonymous();
			let release;
			const held = new Promise((resolve) => {
				release = resolve;
			});
			try {
				const page = await visitor.newPage();
				const gallery = catalog.galleries.lightboxCatalog;
				let requestedUrl;
				const scripts = [];
				page.on('request', (request) => {
					if (request.resourceType() === 'script') {
						scripts.push(request.url());
					}
				});
				await page.route(
					`**/modula/v2/gallery/${gallery.id}/items*`,
					async (route) => {
						const url = route.request().url();
						if (
							['1', 'true'].includes(
								new URL(url).searchParams.get('all')
							)
						) {
							requestedUrl = url;
							await held;
						}
						await route.continue();
					}
				);
				await page.goto(
					`${catalog.pages.lightboxCatalog}#e2egallery-${gallery.id}-5`
				);
				await expect.poll(() => Boolean(requestedUrl)).toBe(true);
				const root = page.locator(`#modula-${gallery.id}`);
				await expect(root.locator('.modula-item')).toHaveCount(2);
				expect(
					await page.evaluate(() => typeof window.ModulaFancybox)
				).toBe('undefined');
				const before = scripts.length;
				if (destroy) {
					await page.evaluate(
						(id) => window.ModulaGalleryDestroy(id),
						`modula-${gallery.id}`
					);
				}
				const response = page.waitForResponse(
					(entry) => entry.url() === requestedUrl && entry.ok()
				);
				release();
				await response;
				if (destroy) {
					await page.waitForTimeout(750);
					await expect(
						page.locator('.modula-fancybox-container')
					).toHaveCount(0);
					expect(scripts).toHaveLength(before);
				} else {
					const lightbox = page.locator('.modula-fancybox-container');
					await expect(lightbox).toBeVisible();
					await expect(
						lightbox.locator(
							'.fancybox__slide.is-selected img:not(.is-clone)'
						)
					).toHaveAttribute('src', /image-5\.jpg/);
					await page.keyboard.press('Escape');
					await expect(lightbox).toHaveCount(0);
				}
			} finally {
				release();
				await evidence.closeVisitor(visitor);
			}
		});
	}
}
