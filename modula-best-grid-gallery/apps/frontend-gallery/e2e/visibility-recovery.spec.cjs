const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

async function attachPhase(testInfo, name, records) {
	await testInfo.attach(name, {
		body: JSON.stringify(records, null, 2),
		contentType: 'application/json',
	});
}

for (const variant of ['dom', 'rest', 'automatic']) {
	test(`a stalled ${variant} layout chunk stays within recovery and can retry after late delivery`, async ({
		page: adminPage,
		evidence,
	}) => {
		const visitor = variant === 'rest' ? null : await evidence.anonymous();
		let release;
		const held = new Promise((resolve) => {
			release = resolve;
		});
		try {
			const page = visitor ? await visitor.newPage() : adminPage;
			await page.goto(
				variant === 'automatic'
					? catalog.pages.automatic
					: catalog.pages.catalog
			);
			await expect(
				page.locator(
					`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
				)
			).toBeVisible();
			const galleryId =
				catalog.galleries[
					variant === 'automatic' ? 'automatic' : 'hiddenSlider'
				].id;
			const root = page.locator(`#modula-${galleryId}`);
			if (variant === 'automatic') {
				// PHP normalizes new saves to justified-grid. Also exercise the
				// compatible grid + automatic payload accepted by DOM/manual init.
				await page
					.locator(
						`script[data-modula-gallery-id="modula-${galleryId}"]`
					)
					.evaluate((script) => {
						const data = JSON.parse(script.textContent);
						data.settings.general.type = 'grid';
						data.settings.layout.gridType = 'automatic';
						script.textContent = JSON.stringify(data);
					});
			}
			if (variant === 'rest') {
				const nonceResponse = await page.request.get(
					'/wp-admin/admin-ajax.php?action=rest-nonce'
				);
				const nonce = await nonceResponse.text();
				await root.evaluate((element) => {
					element.dataset.modulaBootstrap = 'rest';
				});
				await page.route(
					`**/modula/v2/gallery/${galleryId}/bootstrap*`,
					async (route) => {
						const response = await route.fetch({
							headers: {
								...route.request().headers(),
								'x-wp-nonce': nonce,
							},
						});
						expect(response.ok()).toBe(true);
						await route.fulfill({ response });
					}
				);
			}
			let requested = 0;
			// Bootstrap and Masonry are ready. Hold only the dormant gallery's layout.
			await page.route(
				'**/assets/js/front/*.modula-gallery.js',
				async (route) => {
					requested++;
					await held;
					await route.continue();
				}
			);
			await page
				.getByRole('button', {
					name:
						variant === 'automatic'
							? 'Show gallery tab'
							: 'Show Slider tab',
					exact: true,
				})
				.click();
			await expect.poll(() => requested).toBeGreaterThan(0);
			await expect(
				root.getByRole('button', { name: 'Try again' })
			).toBeVisible({ timeout: 14000 });
			release();
			await page.waitForLoadState('networkidle');
			await expect(root.getByRole('alert')).toContainText(
				'Could not load gallery'
			);
			await root.getByRole('button', { name: 'Try again' }).click();
			await expect(root.locator('.modula-item').first()).toBeVisible();
		} finally {
			release();
			if (visitor) {
				await evidence.closeVisitor(visitor);
			}
		}
	});
}

test('destroy by instance id also cleans up a detached gallery', async ({
	evidence,
}) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.visible);
		const id = `modula-${catalog.galleries.visible.id}`;
		await expect(
			page.locator(`#${id} .modula-masonry-react`)
		).toBeVisible();
		const destroyed = await page.evaluate((target) => {
			document.getElementById(target).remove();
			window.ModulaGalleryDestroy(target);
			return window.ModulaGalleryGetInstance(target) === null;
		}, id);
		expect(destroyed).toBe(true);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('retry can replace a stalled REST load without waiting for its stale response', async ({
	page,
}) => {
	const nonceResponse = await page.request.get(
		'/wp-admin/admin-ajax.php?action=rest-nonce'
	);
	const nonce = await nonceResponse.text();
	const id = catalog.galleries.visible.id;
	let release;
	const held = new Promise((resolve) => {
		release = resolve;
	});
	let requests = 0;
	await page.addInitScript((galleryId) => {
		document.addEventListener('DOMContentLoaded', () => {
			document.getElementById(
				`modula-${galleryId}`
			).dataset.modulaBootstrap = 'rest';
		});
		window.galleryMounts = [];
		document.addEventListener('modula:gallery:mounted', (event) =>
			window.galleryMounts.push(event.detail.element.id)
		);
	}, id);
	await page.route(`**/modula/v2/gallery/${id}/bootstrap*`, async (route) => {
		requests++;
		// Use the real protected endpoint and this test administrator's nonce.
		const response = await route.fetch({
			headers: { ...route.request().headers(), 'x-wp-nonce': nonce },
		});
		expect(response.ok()).toBe(true);
		if (requests === 1) {
			await held;
		}
		await route.fulfill({ response });
	});
	try {
		await page.goto(catalog.pages.visible);
		await expect.poll(() => requests).toBe(1);
		const root = page.locator(`#modula-${id}`);
		await expect(
			root.getByRole('button', { name: 'Try again' })
		).toBeVisible({ timeout: 14000 });
		await root.getByRole('button', { name: 'Try again' }).click();
		await expect.poll(() => requests, { timeout: 4000 }).toBe(2);
		await expect(root.locator('.modula-masonry-react')).toBeVisible();
		release();
		await page.waitForLoadState('networkidle');
		await expect
			.poll(() => page.evaluate(() => window.galleryMounts.length))
			.toBe(1);
	} finally {
		release();
	}
});

test('a failed bootstrap chunk retries once without duplicate mounts', async ({
	evidence,
}, testInfo) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		let fail = true;
		let rejected = 0;
		await page.route(
			'**/assets/js/front/*.modula-gallery.js',
			async (route) => {
				if (fail) {
					rejected++;
					return route.abort('failed');
				}
				return route.continue();
			}
		);
		await page.addInitScript(() => {
			window.galleryMounts = [];
			document.addEventListener('modula:gallery:mounted', (event) =>
				window.galleryMounts.push(event.detail.element.id)
			);
		});
		await page.goto(catalog.pages.visible);
		const root = page.locator(`#modula-${catalog.galleries.visible.id}`);
		await expect(
			root.getByRole('button', { name: 'Try again' })
		).toBeVisible();
		expect(rejected).toBeGreaterThan(0);
		fail = false;
		await root.getByRole('button', { name: 'Try again' }).click();
		await expect(root.locator('.modula-masonry-react')).toBeVisible();
		await expect(root.locator('.modula-item')).toHaveCount(6);
		await expect
			.poll(() => page.evaluate(() => window.galleryMounts.length))
			.toBe(1);
		await attachPhase(testInfo, 'failed-chunk-retry', {
			rejected,
			mounted: 1,
		});
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('the no-JavaScript fallback keeps visible and offscreen images usable', async ({
	evidence,
}) => {
	const visitor = await evidence.anonymous(
		{ width: 390, height: 1000 },
		{ javaScriptEnabled: false }
	);
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.catalog);
		for (const name of ['visible', 'farOffscreen']) {
			const root = page.locator(`#modula-${catalog.galleries[name].id}`);
			const image = root.locator('img').first();
			await image.scrollIntoViewIfNeeded();
			await expect(image).toBeVisible();
			await expect
				.poll(() =>
					image.evaluate(
						(element) =>
							element.complete && element.naturalWidth > 0
					)
				)
				.toBe(true);
			await expect(root).not.toHaveClass(/modula-gallery-initialized/);
			await evidence.capture(page, `no-javascript-${name}`);
		}
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('initial and same-page item deeplinks activate a dormant gallery', async ({
	evidence,
}) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		const hash = `#e2egallery-${catalog.galleries.farOffscreen.id}-2`;
		for (const initial of [true, false]) {
			await page.goto('about:blank');
			await page.goto(catalog.pages.catalog + (initial ? hash : ''));
			if (!initial) {
				await expect(
					page.locator(`#modula-${catalog.galleries.farOffscreen.id}`)
				).not.toHaveClass(/modula-gallery-initialized/);
				await page.evaluate((target) => {
					window.location.hash = target;
				}, hash);
			}
			const lightbox = page.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			await expect
				.poll(async () => {
					const src = await lightbox
						.locator(
							'.fancybox__slide.is-selected img:not(.is-clone)'
						)
						.getAttribute('src');
					const selected = new URL(src);
					return selected.origin + selected.pathname;
				})
				.toBe(catalog.attachments[1].url);
			await page.keyboard.press('Escape');
			await expect(lightbox).toHaveCount(0);
		}
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('saved lazy-loading choices survive preview and reopening and govern offscreen loading', async ({
	page,
	evidence,
}) => {
	const gallery = catalog.galleries.farOffscreen;
	async function openPerformance() {
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
		return page
			.getByRole('region', { name: 'Performance', exact: true })
			.locator('.modula-settings-editor__field-row')
			.filter({
				has: page.getByText('Load images as people scroll', {
					exact: true,
				}),
			})
			.getByRole('switch');
	}
	for (const lazy of [false, true]) {
		const toggle = await openPerformance();
		const saved = page.waitForResponse(
			async (response) =>
				response
					.url()
					.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
				(response.request().method() === 'PATCH' ||
					response.request().headers()['x-http-method-override'] ===
						'PATCH') &&
				response.ok() &&
				(await response.json()).performance.lazyLoad === lazy
		);
		await toggle.click();
		await saved;
		await expect(
			page.locator('.modula-gallery-takeover__topbar-save-status')
		).toHaveText('Saved');
		await expect(page.locator('main .modula-item')).toHaveCount(6);
		await expect(await openPerformance()).toBeChecked({ checked: lazy });
		await expect(page.locator('main .modula-item').first()).toBeVisible();
		await evidence.capture(page, `lazy-${lazy}-editor-reopened`);
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.catalog);
			await expect(
				publicPage.locator(
					`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
				)
			).toBeVisible();
			const root = publicPage.locator(`#modula-${gallery.id}`);
			expect((await root.boundingBox()).y).toBeGreaterThan(5000);
			if (lazy) {
				await expect(root).not.toHaveClass(
					/modula-gallery-initialized/
				);
				await root.scrollIntoViewIfNeeded();
			}
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await expect(root.locator('img').first()).toHaveAttribute(
				'loading',
				lazy ? 'lazy' : 'eager'
			);
			await evidence.capture(publicPage, `lazy-${lazy}-visitor`);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	}
});

for (const warmBootstrap of [false, true]) {
	test(`manual initialization settles and detached pending destruction wins with bootstrap ${warmBootstrap ? 'loaded' : 'unloaded'}`, async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous();
		let release;
		const held = new Promise((resolve) => {
			release = resolve;
		});
		try {
			const page = await visitor.newPage();
			if (warmBootstrap) {
				await page.goto(catalog.pages.catalog);
				await expect(
					page.locator(
						`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
					)
				).toBeVisible();
			}
			let chunks = 0;
			await page.route(
				'**/assets/js/front/*.modula-gallery.js',
				async (route) => {
					chunks++;
					await held;
					await route.continue();
				}
			);
			if (!warmBootstrap) {
				await page.goto(catalog.pages.slider);
			}
			expect(chunks).toBe(0);
			expect(
				await page.evaluate(() => typeof window.ModulaGalleryInit)
			).toBe('function');
			await page.evaluate(() => {
				window.manualInitialization = Promise.all([
					window.ModulaGalleryInit(),
					window.ModulaGalleryInit(),
				]).then(() => {
					window.manualInitializationSettled = true;
				});
			});
			await expect.poll(() => chunks).toBeGreaterThan(0);
			const id = `modula-${catalog.galleries.hiddenSlider.id}`;
			await page.evaluate((target) => {
				const element = document.getElementById(target);
				const parent = element.parentElement;
				const next = element.nextSibling;
				element.remove();
				window.ModulaGalleryDestroy(target);
				parent.insertBefore(element, next);
			}, id);
			await expect
				.poll(
					() =>
						page.evaluate(() => window.manualInitializationSettled),
					{ timeout: 2000 }
				)
				.toBe(true);
			release();
			await page.evaluate(() => window.manualInitialization);
			await page.waitForLoadState('networkidle');
			await expect(page.locator(`#${id}`)).not.toHaveClass(
				/modula-gallery-initialized/
			);
			expect(
				await page.evaluate(
					(target) => window.ModulaGalleryGetInstance(target),
					id
				)
			).toBe(null);
			await page.reload();
			await page.evaluate(() =>
				Promise.all([
					window.ModulaGalleryInit(),
					window.ModulaGalleryInit(),
				])
			);
			await page
				.getByRole('button', { name: 'Show Slider tab', exact: true })
				.click();
			await expect(
				page.locator(`#${id} .modula-item`).first()
			).toBeVisible();
			await expect(page.locator(`#${id} .modula-item`)).toHaveCount(6);
		} finally {
			release();
			await evidence.closeVisitor(visitor);
		}
	});
}

for (const width of [1440, 390]) {
	test(`hidden and far-offscreen galleries stay dormant after 15 seconds at ${width}px, then activate once`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous({ width, height: 1000 });
		try {
			const page = await visitor.newPage();
			const records = [];
			let phase = 'navigation';
			page.on('request', (request) => {
				records.push({
					phase,
					type: request.resourceType(),
					url: request.url(),
				});
			});
			page.on('console', (message) => {
				if (['warning', 'error'].includes(message.type())) {
					records.push({
						phase,
						type: message.type(),
						message: message.text(),
					});
				}
			});
			await page.addInitScript(() => {
				window.galleryMounts = [];
				document.addEventListener('modula:gallery:mounted', (event) => {
					window.galleryMounts.push(event.detail.element.id);
				});
			});
			await page.goto(catalog.pages.catalog);
			await expect(
				page.locator(
					`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
				)
			).toBeVisible();
			phase = 'idle';
			await page.waitForTimeout(15000);
			await attachPhase(
				testInfo,
				'navigation-network-console',
				records.filter((record) => record.phase === 'navigation')
			);
			await attachPhase(
				testInfo,
				'idle-network-console',
				records.filter((record) => record.phase === 'idle')
			);
			for (const name of ['farOffscreen', 'hiddenTab', 'hiddenSlider']) {
				const root = page.locator(
					`#modula-${catalog.galleries[name].id}`
				);
				await expect(root).not.toHaveClass(
					/modula-gallery-initialized/
				);
			}
			expect(
				records.filter((record) =>
					/stall|forcing bootstrap/i.test(record.message || '')
				)
			).toEqual([]);
			expect(
				records.filter(
					(record) =>
						record.phase === 'idle' &&
						/modula-gallery.*\.js|\.modula-gallery\.js/.test(
							record.url || ''
						)
				)
			).toEqual([]);
			phase = 'activation';
			await page
				.getByRole('button', { name: 'Show gallery tab', exact: true })
				.click();
			const hidden = page.locator(
				`#modula-${catalog.galleries.hiddenTab.id}`
			);
			await expect(hidden.locator('.modula-masonry-react')).toBeVisible();
			await page.evaluate(() => {
				const panel = document.querySelector('#e2e-hidden-tab');
				panel.hidden = true;
				panel.hidden = false;
				window.dispatchEvent(new Event('resize'));
				window.dispatchEvent(new Event('scroll'));
			});
			const far = page.locator(
				`#modula-${catalog.galleries.farOffscreen.id}`
			);
			await far.scrollIntoViewIfNeeded();
			await expect(far.locator('.modula-masonry-react')).toBeVisible();
			for (const name of ['visible', 'hiddenTab', 'farOffscreen']) {
				const id = `modula-${catalog.galleries[name].id}`;
				await expect
					.poll(() =>
						page.evaluate(
							(target) =>
								window.galleryMounts.filter(
									(entry) => entry === target
								).length,
							id
						)
					)
					.toBe(1);
			}
			await attachPhase(
				testInfo,
				'activation-network-console',
				records.filter((record) => record.phase === 'activation')
			);
			await evidence.capture(page, 'far-gallery-activated');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

test('destroying waiting galleries by element or id prevents later initialization', async ({
	evidence,
}) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.catalog);
		await expect(
			page.locator(
				`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
			)
		).toBeVisible();
		await page.evaluate(
			async ({ hidden, far }) => {
				window.ModulaGalleryDestroy(document.getElementById(hidden));
				window.ModulaGalleryDestroy(far);
				await Promise.all([
					window.ModulaGalleryInit(),
					window.ModulaGalleryInit(),
				]);
			},
			{
				hidden: `modula-${catalog.galleries.hiddenTab.id}`,
				far: `modula-${catalog.galleries.farOffscreen.id}`,
			}
		);
		for (const name of ['hiddenTab', 'farOffscreen']) {
			const id = `modula-${catalog.galleries[name].id}`;
			expect(
				await page.evaluate(
					(target) =>
						window.ModulaGalleryGetInstance(target) === null,
					id
				)
			).toBe(true);
			await expect(page.locator(`#${id}`)).not.toHaveClass(
				/modula-gallery-initialized/
			);
		}
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('a stalled bootstrap reaches a retry error and ignores its late completion', async ({
	evidence,
}, testInfo) => {
	const visitor = await evidence.anonymous();
	let release;
	const held = new Promise((resolve) => {
		release = resolve;
	});
	try {
		const page = await visitor.newPage();
		await page.route(
			'**/assets/js/front/*.modula-gallery.js',
			async (route) => {
				await held;
				await route.continue();
			}
		);
		const events = [];
		page.on('console', (message) =>
			events.push({ type: message.type(), text: message.text() })
		);
		await page.goto(catalog.pages.visible, {
			waitUntil: 'domcontentloaded',
		});
		const root = page.locator(`#modula-${catalog.galleries.visible.id}`);
		await expect(
			root.getByRole('button', { name: 'Try again' })
		).toBeVisible({ timeout: 14000 });
		release();
		await page.waitForLoadState('networkidle');
		await expect(root.getByRole('alert')).toContainText(
			'Could not load gallery'
		);
		await expect(root).not.toHaveClass(/modula-gallery-initialized/);
		await root.getByRole('button', { name: 'Try again' }).click();
		await expect(root.locator('.modula-masonry-react')).toBeVisible();
		await expect(root.locator('.modula-item')).toHaveCount(6);
		await attachPhase(testInfo, 'stalled-bootstrap-recovery', events);
	} finally {
		release();
		await evidence.closeVisitor(visitor);
	}
});
