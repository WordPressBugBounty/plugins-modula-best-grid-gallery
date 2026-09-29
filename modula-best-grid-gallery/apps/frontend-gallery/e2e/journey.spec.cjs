const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const mode = process.env.MODULA_E2E_MODE;
// Pro follows the successful Lite journey on the same existing Beta gallery.
const scenario = {
	lite: {
		startingColumns: 3,
		startingGutter: 16,
		savedColumns: 2,
		retryColumns: 4,
		retryGutter: 28,
		sliderEnabled: false,
	},
	pro: {
		startingColumns: 4,
		startingGutter: 28,
		savedColumns: 3,
		retryColumns: 2,
		retryGutter: 32,
		sliderEnabled: true,
	},
}[mode];
const gallery = catalog.galleries.visible;
const saveStatus = '.modula-gallery-takeover__topbar-save-status';

function isSettingsWrite(request) {
	return (
		request.method() === 'PATCH' ||
		request.headers()['x-http-method-override'] === 'PATCH'
	);
}

function settingsResponse(page, status = 200) {
	return page.waitForResponse(
		(response) =>
			response
				.url()
				.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
			isSettingsWrite(response.request()) &&
			response.status() === status,
		{ timeout: 15000 }
	);
}

async function openLayout(page) {
	await page.goto(gallery.editor);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	await page.getByRole('button', { name: 'Masonry', exact: true }).click();
	const slider = page.getByRole('option', { name: /^Slider/ });
	if (scenario.sliderEnabled) {
		await expect(slider).toBeEnabled();
	} else {
		await expect(slider).toBeDisabled();
	}
	await page.keyboard.press('Escape');
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
}

async function columns(page, count) {
	await page
		.getByRole('region', { name: 'Gallery layout', exact: true })
		.getByRole('button', { name: /^\d+ columns?$/ })
		.click();
	await page
		.getByRole('option', { name: `${count} columns`, exact: true })
		.click();
}

async function expectPaint(root, columnCount) {
	const tiles = root.locator('.modula-item');
	await expect(tiles).toHaveCount(6);
	// Assert the rendered geometry and image contents, without reading Redux/PHP internals.
	await expect
		.poll(async () =>
			tiles.evaluateAll(
				(elements) =>
					new Set(
						elements.map((element) =>
							Math.round(element.getBoundingClientRect().left)
						)
					).size
			)
		)
		.toBe(columnCount);
	for (let index = 1; index <= 6; index++) {
		const img = root.getByRole('img', {
			name: `E2E image ${index}`,
			exact: true,
		});
		await img.scrollIntoViewIfNeeded();
		await expect(img).toBeVisible();
		await expect
			.poll(() =>
				img.evaluate(
					(element) =>
						element.complete &&
						element.naturalWidth > 0 &&
						element.getBoundingClientRect().width > 20 &&
						element.getBoundingClientRect().height > 20
				)
			)
			.toBe(true);
	}
}

async function checkVisitors(evidence, columnCount, gutter) {
	for (const width of [1440, 390]) {
		const visitor = await evidence.anonymous({ width, height: 1000 });
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.visible);
			await expect(page.locator('body')).not.toHaveClass(/logged-in/);
			expect(
				(await visitor.cookies()).some((cookie) =>
					cookie.name.startsWith('wordpress_logged_in_')
				)
			).toBe(false);
			const root = page.locator(`#modula-${gallery.id}`);
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await expectPaint(root, width === 390 ? 1 : columnCount);
			if (width === 1440) {
				await expect(root.locator('.modula-masonry-react')).toHaveCSS(
					'gap',
					`${gutter}px`
				);
			}
			await root.scrollIntoViewIfNeeded();
			await evidence.capture(page, `visitor-${width}`);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	}
}

test('real editor save, failed-save retry, reopen, and anonymous visitor layout', async ({
	page,
	evidence,
}, testInfo) => {
	await openLayout(page);
	await expect(
		page.getByRole('button', {
			name: `${scenario.startingColumns} columns`,
			exact: true,
		})
	).toBeVisible();
	await expect(
		page.getByRole('spinbutton', { name: 'Value', exact: true })
	).toHaveValue(String(scenario.startingGutter));
	const initialColumns = scenario.savedColumns;
	const saved = settingsResponse(page);
	await columns(page, initialColumns);
	await saved;
	await expect(page.locator(saveStatus)).toHaveText('Saved');
	await expectPaint(page.locator('main'), initialColumns);
	await openLayout(page);
	await expect(
		page.getByRole('button', {
			name: `${initialColumns} columns`,
			exact: true,
		})
	).toBeVisible();

	// Reject only this gallery's next PATCH. Every successful response comes from WordPress.
	const rejectedColumns = scenario.retryColumns;
	const url = `**/modula/v2/gallery/${gallery.id}/settings*`;
	await page.route(url, async (route) => {
		if (!isSettingsWrite(route.request())) {
			return route.continue();
		}
		await route.fulfill({
			status: 503,
			contentType: 'application/json',
			body: JSON.stringify({
				code: 'e2e_save_failure',
				message: 'E2E: save unavailable; your edits are retained.',
				data: { status: 503 },
			}),
		});
	});
	const failed = settingsResponse(page, 503);
	await columns(page, rejectedColumns);
	await failed;
	await expect(page.locator(saveStatus)).toHaveText(
		'E2E: save unavailable; your edits are retained.'
	);
	await expect(
		page.getByRole('button', {
			name: `${rejectedColumns} columns`,
			exact: true,
		})
	).toBeVisible();
	await expectPaint(page.locator('main'), rejectedColumns);
	await evidence.capture(page, 'retained-edits-after-save-failure');
	await page.unroute(url);
	// Takeover retries on the next edit. Retain the failed column change while editing spacing.
	const gutter = scenario.retryGutter;
	const retried = settingsResponse(page);
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.fill(String(gutter));
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.press('Tab');
	const response = await retried;
	const persisted = await response.json();
	expect(persisted.layout.gridType).toBe(String(rejectedColumns));
	expect(Number(persisted.layout.gutter)).toBe(gutter);
	await testInfo.attach('saved-settings-after-retry', {
		body: JSON.stringify(persisted, null, 2),
		contentType: 'application/json',
	});
	await expect(page.locator(saveStatus)).toHaveText('Saved');
	await openLayout(page);
	await expect(
		page.getByRole('button', {
			name: `${rejectedColumns} columns`,
			exact: true,
		})
	).toBeVisible();
	await expect(
		page.getByRole('spinbutton', { name: 'Value', exact: true })
	).toHaveValue(String(gutter));
	await expectPaint(page.locator('main'), rejectedColumns);
	await evidence.capture(page, 'editor-reopened');
	await checkVisitors(evidence, rejectedColumns, gutter);
});

test('classic editor save and Same-page classic and Beta layout paint', async ({
	page,
	evidence,
}) => {
	await page.goto(catalog.galleries.classic.editor);
	await expect(page.locator('#title')).toBeVisible();
	const title = `${catalog.run} classic ${mode} saved`;
	await page.locator('#title').fill(title);
	await Promise.all([
		page.waitForNavigation(),
		page
			.getByRole('button', { name: 'Update Gallery', exact: true })
			.click(),
	]);
	await page.goto(catalog.galleries.classic.editor);
	await expect(page.locator('#title')).toHaveValue(title);
	for (const name of ['classic', 'mixed']) {
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages[name]);
			await expect(publicPage.locator('body')).not.toHaveClass(
				/logged-in/
			);
			const classic = publicPage.locator(
				`#jtg-${catalog.galleries.classic.id}`
			);
			await expect(classic).toBeVisible();
			await expectPaint(classic, 3);
			await expect(
				classic.locator('.modula-gallery-react-host')
			).toHaveCount(0);
			if (name === 'mixed') {
				const beta = publicPage.locator(
					`#modula-${catalog.galleries.hiddenTab.id}`
				);
				await expect(
					beta.locator('.modula-masonry-react')
				).toBeVisible();
				await expectPaint(beta, 3);
			}
			await evidence.capture(publicPage, name);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	}
});

test('shared visible, offscreen, hidden-tab and hidden-Slider baseline', async ({
	evidence,
}, testInfo) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.catalog);
		await expect(page.locator('body')).not.toHaveClass(/logged-in/);
		await expect(
			page.locator(`#modula-${gallery.id} .modula-masonry-react`)
		).toBeVisible();
		await expect(page.locator('#e2e-hidden-tab')).toBeHidden();
		await expect(page.locator('#e2e-hidden-slider')).toBeHidden();
		const far = page.locator(
			`#modula-${catalog.galleries.farOffscreen.id}`
		);
		expect((await far.boundingBox()).y).toBeGreaterThan(5000);
		// Observation only: later tickets own visibility/recovery and performance corrections.
		await page.waitForTimeout(12000);
		await testInfo.attach('visibility-baseline', {
			body: JSON.stringify(
				await page
					.locator('.modula-gallery-modern')
					.evaluateAll((roots) =>
						roots.map((root) => ({
							id: root.id,
							classes: root.className,
							visible: root.getBoundingClientRect().height > 0,
							images: [...root.querySelectorAll('img')].map(
								(img) => ({
									src: img.currentSrc || img.src,
									loaded:
										img.complete && img.naturalWidth > 0,
								})
							),
						}))
					),
				null,
				2
			),
			contentType: 'application/json',
		});
		await evidence.capture(page, 'catalog-initial-baseline');
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
