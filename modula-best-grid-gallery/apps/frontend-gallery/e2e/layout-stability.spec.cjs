const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const { observeLayout, readLayout } = require('./layout-observer.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const gallery = catalog.galleries.layoutStability;
const rootSelector = `#modula-${gallery.id}`;
const profiles = [
	{
		name: 'desktop',
		width: 1350,
		height: 940,
		dpr: 1,
		motion: 'no-preference',
	},
	{
		name: 'mobile',
		width: 412,
		height: 823,
		dpr: 1.75,
		motion: 'no-preference',
	},
	{
		name: 'mobile-reduced',
		width: 390,
		height: 844,
		dpr: 2,
		motion: 'reduce',
	},
];

async function save(page, action, accepts) {
	const saved = page.waitForResponse(
		async (response) =>
			response
				.url()
				.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
			(response.request().method() === 'PATCH' ||
				response.request().headers()['x-http-method-override'] ===
					'PATCH') &&
			response.ok() &&
			accepts(await response.json())
	);
	await action();
	await saved;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
}

async function chooseLayout(page, current, next, type) {
	await page.getByRole('button', { name: current, exact: true }).click();
	await save(
		page,
		() => page.getByRole('option', { name: next, exact: true }).click(),
		(settings) => settings.general.type === type
	);
}

async function withParallax(page, evidence, check) {
	await page.goto(gallery.editor);
	await chooseLayout(page, 'Masonry', 'Parallax', 'parallax-masonry');
	try {
		await expect(
			page.locator('main .modula-parallax-masonry')
		).toBeVisible();
		await expect(
			page.locator('main .modula-parallax-masonry-item')
		).toHaveCount(6);
		await page.reload();
		await expect(
			page.getByRole('button', { name: 'Parallax', exact: true })
		).toBeVisible();
		await expect(
			page.locator('main .modula-parallax-masonry')
		).toBeVisible();
		await evidence.capture(page, 'saved-parallax-preview');
		await check();
	} finally {
		await page.goto(gallery.editor);
		await chooseLayout(page, 'Parallax', 'Masonry', 'grid');
	}
}

async function visitorFor(evidence, profile, options = {}) {
	return evidence.anonymous(
		{ width: profile.width, height: profile.height },
		{
			deviceScaleFactor: profile.dpr,
			reducedMotion: profile.motion,
			...options,
		}
	);
}

async function assertStable(page, evidence, testInfo, name) {
	await expect(
		page.locator(`${rootSelector} .modula-parallax-masonry`)
	).toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.layoutEvidence.frames.some(
					(frame) => frame.visibleImages.length > 0
				)
			)
		)
		.toBe(true);
	await page.waitForTimeout(800);
	await evidence.capture(page, name);
	const data = await readLayout(page);
	await testInfo.attach(name, {
		body: JSON.stringify(data),
		contentType: 'application/json',
	});
	const firstPaint = data.paints.find(
		(paint) => paint.name === 'first-contentful-paint'
	);
	expect(
		firstPaint,
		'the comparison must include an actual contentful paint'
	).toBeTruthy();
	const frames = data.frames.filter(
		(frame) => frame.time >= firstPaint.startTime
	);
	expect(frames.some((frame) => frame.mounted)).toBe(true);
	const heights = frames.map((frame) => frame.root.height);
	expect
		.soft(
			Math.max(...heights) - Math.min(...heights),
			'reserve the viewfinder from first paint through mount'
		)
		.toBeLessThanOrEqual(0.01);
	const followingOffsets = frames
		.filter((frame) => frame.after)
		.map((frame) => frame.after.top - frame.root.top);
	if (followingOffsets.length) {
		expect
			.soft(
				Math.max(...followingOffsets) - Math.min(...followingOffsets),
				'content below the gallery must keep its position relative to it'
			)
			.toBeLessThanOrEqual(0.01);
	}
	expect
		.soft(
			data.shifts.filter(
				(shift) =>
					!shift.recentInput &&
					shift.sources.some((source) => source.gallery)
			),
			'no unintended layout shift in the gallery'
		)
		.toEqual([]);
	const visibleFrames = frames.filter((frame) => frame.visibleImages.length);
	expect(visibleFrames.length).toBeGreaterThan(1);
	// A delay/hidden-gallery workaround must not pass just by keeping the image invisible.
	const firstVisible = visibleFrames[0].time;
	const lastImageLoad = Math.max(
		0,
		...data.loads
			.filter((load) => load.url.includes('/wp-content/uploads/'))
			.map((load) => load.time)
	);
	expect(firstVisible - lastImageLoad).toBeLessThan(1000);
	return data;
}

async function lightboxJourney(page) {
	const first = page.locator(`${rootSelector} .modula-item-link`).first();
	// Parallax intentionally moves tiles continuously; keyboard activation is stable.
	await first.focus();
	await page.keyboard.press('Enter');
	const lightbox = page.locator('.modula-fancybox-container');
	await expect(lightbox).toBeVisible();
	const image = lightbox.locator(
		'.fancybox__slide.is-selected img:not(.is-clone)'
	);
	await expect(image).toBeVisible();
	const initial = await image.getAttribute('src');
	await page.keyboard.press('ArrowRight');
	await expect(image).not.toHaveAttribute('src', initial);
	await page.keyboard.press('Escape');
	await expect(lightbox).toHaveCount(0);
	await first.focus();
	await page.keyboard.press('Enter');
	await expect(lightbox).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(lightbox).toHaveCount(0);
}

async function setLazy(page, enabled) {
	await page.goto(gallery.editor);
	await page
		.getByRole('button', { name: 'Open Advanced settings', exact: true })
		.click();
	await page
		.getByRole('button', { name: 'Performance', exact: true })
		.click();
	const control = page
		.getByRole('region', { name: 'Performance', exact: true })
		.locator('.modula-settings-editor__field-row')
		.filter({ hasText: 'Load images as people scroll' })
		.getByRole('switch');
	if ((await control.isChecked()) !== enabled) {
		await save(
			page,
			() => control.click(),
			(settings) => settings.performance.lazyLoad === enabled
		);
	}
}

async function setShuffle(page, enabled) {
	await page.goto(gallery.editor);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const control = page
		.getByRole('region', { name: 'Gallery layout', exact: true })
		.locator('.modula-settings-editor__field-row')
		.filter({ hasText: 'Different order on every visit' })
		.getByRole('switch');
	if ((await control.isChecked()) !== enabled) {
		await save(
			page,
			() => control.click(),
			(settings) => settings.general.shuffle === enabled
		);
	}
}

if (process.env.MODULA_E2E_MODE === 'pro') {
	for (const profile of profiles) {
		test(`saved Parallax remains stable with cold/warm cache and delayed images/CSS: ${profile.name}`, async ({
			page,
			evidence,
		}, testInfo) => {
			await withParallax(page, evidence, async () => {
				const visitor = await visitorFor(evidence, profile);
				try {
					for (const condition of [
						'cold',
						'warm',
						'delayed-images',
						'delayed-css',
					]) {
						const publicPage = await visitor.newPage();
						const cdp = await visitor.newCDPSession(publicPage);
						await cdp.send('Emulation.setCPUThrottlingRate', {
							rate: 4,
						});
						if (condition.startsWith('delayed')) {
							// These two runs test ordering, not warm-cache performance. Routing disables HTTP cache.
							const pattern =
								condition === 'delayed-images'
									? '**/wp-content/uploads/**'
									: '**/assets/css/front/*modula-gallery*.css*';
							await publicPage.route(pattern, async (route) => {
								await new Promise((resolve) =>
									setTimeout(resolve, 1000)
								);
								await route.continue();
							});
						}
						await observeLayout(publicPage, gallery.id);
						await publicPage.goto(catalog.pages.layoutStability);
						const data = await assertStable(
							publicPage,
							evidence,
							testInfo,
							`layout-${profile.name}-${condition}`
						);
						if (condition === 'cold') {
							const transforms = new Set(
								data.frames
									.filter((frame) => frame.items.length)
									.map(
										(frame) =>
											frame.items[0].columnTransform
									)
							);
							if (profile.motion === 'reduce')
								expect(transforms.size).toBeLessThanOrEqual(2);
							else
								expect(
									transforms.size,
									'normal Parallax motion must remain active'
								).toBeGreaterThan(2);
						}
						if (condition === 'warm') {
							await lightboxJourney(publicPage);
							for (const width of [720, 1200, profile.width]) {
								await publicPage.setViewportSize({
									width,
									height: profile.height,
								});
								await expect(
									publicPage.locator(
										`${rootSelector} .modula-parallax-masonry`
									)
								).toBeVisible();
								await expect
									.poll(() =>
										publicPage
											.locator(rootSelector)
											.evaluate(
												(el) =>
													el.getBoundingClientRect()
														.height
											)
									)
									.toBe(profile.height);
							}
						}
					}
				} finally {
					await evidence.closeVisitor(visitor);
				}
			});
		});
	}

	test('saved lazy Parallax remains dormant offscreen and in a hidden tab, then shows images; no-JS fallback stays useful', async ({
		page,
		evidence,
	}, testInfo) => {
		await withParallax(page, evidence, async () => {
			const visitor = await visitorFor(evidence, profiles[1]);
			try {
				const hidden = await visitor.newPage();
				const offscreen = await visitor.newPage();
				await observeLayout(hidden, gallery.id);
				await observeLayout(offscreen, gallery.id);
				await hidden.goto(catalog.pages.layoutStabilityHidden);
				await offscreen.goto(catalog.pages.layoutStabilityOffscreen);
				await offscreen.waitForTimeout(16000);
				for (const target of [hidden, offscreen]) {
					await expect(
						target.locator(
							`${rootSelector}.modula-gallery-initialized`
						)
					).toHaveCount(0);
				}
				await hidden
					.getByRole('button', {
						name: 'Show Parallax tab',
						exact: true,
					})
					.click();
				await offscreen.locator(rootSelector).scrollIntoViewIfNeeded();
				for (const [name, target] of [
					['hidden', hidden],
					['offscreen', offscreen],
				]) {
					await expect(
						target.locator('.modula-parallax-masonry')
					).toBeVisible();
					await expect
						.poll(() =>
							target.evaluate(() =>
								window.layoutEvidence.frames.some(
									(frame) => frame.visibleImages.length
								)
							)
						)
						.toBe(true);
					await target.waitForTimeout(800);
					await evidence.capture(target, `activated-${name}`);
					const data = await readLayout(target);
					await testInfo.attach(`layout-${name}`, {
						body: JSON.stringify(data),
						contentType: 'application/json',
					});
					expect(
						data.shifts.filter(
							(shift) =>
								!shift.recentInput &&
								shift.sources.some((source) => source.gallery)
						)
					).toEqual([]);
				}
			} finally {
				await evidence.closeVisitor(visitor);
			}
			const noJs = await visitorFor(evidence, profiles[1], {
				javaScriptEnabled: false,
			});
			try {
				const fallback = await noJs.newPage();
				await fallback.goto(catalog.pages.layoutStability);
				await expect(
					fallback.locator(`${rootSelector} img`).first()
				).toBeVisible();
				expect(
					await fallback
						.locator(`${rootSelector} img`)
						.first()
						.evaluate((img) => img.complete && img.naturalWidth > 0)
				).toBe(true);
				await evidence.capture(fallback, 'parallax-no-javascript');
			} finally {
				await evidence.closeVisitor(noJs);
			}
		});
	});

	test('saved eager Parallax keeps shuffle and initializes in a hidden tab', async ({
		page,
		evidence,
	}, testInfo) => {
		await withParallax(page, evidence, async () => {
			try {
				await setShuffle(page, true);
				await setLazy(page, false);
				await page.reload();
				await expect(
					page.locator('main .modula-parallax-masonry')
				).toBeVisible();
				const visitor = await visitorFor(evidence, profiles[1]);
				try {
					const hidden = await visitor.newPage();
					await observeLayout(hidden, gallery.id);
					await hidden.goto(catalog.pages.layoutStabilityHidden);
					await expect(
						hidden.locator(
							`${rootSelector}.modula-gallery-initialized`
						)
					).toHaveCount(1);
					await expect(
						hidden.locator('.modula-parallax-masonry')
					).toBeHidden();
					await hidden
						.getByRole('button', {
							name: 'Show Parallax tab',
							exact: true,
						})
						.click();
					await expect
						.poll(() =>
							hidden.evaluate(() =>
								window.layoutEvidence.frames.some(
									(frame) => frame.visibleImages.length
								)
							)
						)
						.toBe(true);
					await evidence.capture(hidden, 'eager-parallax-revealed');
					const visible = await visitor.newPage();
					await observeLayout(visible, gallery.id);
					await visible.goto(catalog.pages.layoutStability);
					await assertStable(
						visible,
						evidence,
						testInfo,
						'layout-eager-shuffle'
					);
					const payload = await visible
						.locator(
							`script[data-modula-gallery-id="modula-${gallery.id}"]`
						)
						.evaluate((el) => JSON.parse(el.textContent));
					expect(payload.settings.general.shuffle).toBe(true);
					expect(payload.settings.performance.lazyLoad).toBe(false);
					const rendered = await visible
						.locator(
							`${rootSelector} .modula-item[data-modula-image-id]`
						)
						.evaluateAll((items) =>
							items.map((item) =>
								Number(
									item.getAttribute('data-modula-image-id')
								)
							)
						);
					expect(rendered).toEqual(
						payload.items.map((item) => item.id)
					);
					await lightboxJourney(visible);
				} finally {
					await evidence.closeVisitor(visitor);
				}
			} finally {
				await setLazy(page, true);
				await setShuffle(page, false);
			}
		});
	});
} else {
	test('the layout fixture keeps a useful Lite gallery', async ({ page }) => {
		await page.goto(catalog.pages.layoutStability);
		await expect(page.locator('.modula-masonry-react')).toBeVisible();
	});
}
