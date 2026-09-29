const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const bootstrapCss = 'modula-gallery-bootstrap.modula-gallery.css';
const bootstrapRoute = `**/${bootstrapCss}*`;

async function stylesheetEvidence(page, testInfo, name) {
	const result = await page.evaluate(
		(filename) => ({
			links: [...document.querySelectorAll('link')]
				.filter((link) => link.href.includes(filename))
				.map((link) => ({
					href: link.href,
					rel: link.rel,
					loaded: Boolean(link.sheet),
				})),
			sheets: [...document.styleSheets]
				.filter((sheet) => sheet.href?.includes(filename))
				.map((sheet) => sheet.href),
			requests: performance
				.getEntriesByType('resource')
				.filter((entry) => entry.name.includes(filename))
				.map((entry) => entry.toJSON()),
		}),
		bootstrapCss
	);
	await testInfo.attach(name, {
		body: JSON.stringify(result, null, 2),
		contentType: 'application/json',
	});
	return result;
}

function expectSingleStylesheet(styles, transfer = true) {
	expect(
		styles.links.filter((link) => link.rel === 'stylesheet')
	).toHaveLength(1);
	expect(styles.sheets).toHaveLength(1);
	expect(styles.requests).toHaveLength(1);
	expect(new Set(styles.links.map((link) => link.href)).size).toBe(1);
	const request = styles.requests[0];
	if (transfer) {
		expect(request.transferSize).toBeGreaterThan(0);
		expect(request.encodedBodySize).toBeGreaterThan(0);
	} else {
		// Local forces revalidation: a 304 may transfer headers, but no CSS body.
		expect(
			request.transferSize === 0 || request.encodedBodySize === 0
		).toBe(true);
	}
}

for (const width of [1440, 390]) {
	test(`Beta galleries share one bootstrap stylesheet on cold and cached navigation at ${width}px`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous({ width, height: 1000 });
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.catalog);
			await expect(
				page.locator(
					`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
				)
			).toBeVisible();
			await page
				.getByRole('button', { name: 'Show gallery tab', exact: true })
				.click();
			await expect(
				page.locator(
					`#modula-${catalog.galleries.hiddenTab.id} .modula-masonry-react`
				)
			).toBeVisible();
			const styles = await stylesheetEvidence(
				page,
				testInfo,
				'cold-multiple-galleries'
			);
			expectSingleStylesheet(styles);
			await page.goto(catalog.pages.visible);
			await expect(
				page.locator(
					`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
				)
			).toBeVisible();
			const cached = await stylesheetEvidence(
				page,
				testInfo,
				'cached-navigation'
			);
			expectSingleStylesheet(cached, false);
			expect(cached.sheets).toEqual(styles.sheets);
			await evidence.capture(page, `cached-styled-gallery-${width}`);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

async function preloadOnly(page, url) {
	// Exercise optimizers that leave an early preload and let JS apply the CSS.
	await page.route(url, async (route) => {
		const response = await route.fetch();
		const html = await response.text();
		await route.fulfill({
			response,
			body: html.replace(
				/<link\b[^>]*id=['"]modula-gallery-bootstrap-css['"][^>]*>/g,
				''
			),
		});
	});
}

for (const width of [1440, 390]) {
	test(`a cold preload race waits for styles before revealing at ${width}px`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous({ width, height: 1000 });
		let release;
		const gate = new Promise((resolve) => {
			release = resolve;
		});
		try {
			const page = await visitor.newPage();
			await preloadOnly(page, catalog.pages.catalog);
			await page.route(bootstrapRoute, async (route) => {
				await gate;
				await route.continue();
			});
			await page.goto(catalog.pages.catalog, {
				waitUntil: 'domcontentloaded',
			});
			await page.waitForFunction(() => window.ModulaGallery);
			const root = page.locator(
				`#modula-${catalog.galleries.visible.id}`
			);
			await expect(root).toHaveClass(/modula-gallery--bootstrap-pending/);
			await page
				.getByRole('button', { name: 'Show gallery tab', exact: true })
				.click();
			await page.evaluate(() => {
				window.ModulaGallery.initAllGalleries();
			});
			await page.waitForTimeout(300);
			await expect(root).not.toHaveClass(/modula-gallery-initialized/);
			await expect(root.locator('.modula-masonry-react')).toHaveCount(0);
			await testInfo.attach('waiting-for-css', {
				body: JSON.stringify(
					await page
						.locator(`link[href*="${bootstrapCss}"]`)
						.evaluateAll((links) =>
							links.map((link) => ({
								href: link.href,
								rel: link.rel,
								loaded: Boolean(link.sheet),
							}))
						)
				),
				contentType: 'application/json',
			});
			release();
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await expect(root.locator('.modula-masonry-react')).toHaveCSS(
				'display',
				'flex'
			);
			await expect(
				page.locator(
					`#modula-${catalog.galleries.hiddenTab.id} .modula-masonry-react`
				)
			).toBeVisible();
			expectSingleStylesheet(
				await stylesheetEvidence(
					page,
					testInfo,
					'preload-race-completed'
				)
			);
			await evidence.capture(page, `delayed-styled-gallery-${width}`);
		} finally {
			release();
			await evidence.closeVisitor(visitor);
		}
	});
}

test('a changed stylesheet build receives a new identity and its new styles', async ({
	evidence,
}, testInfo) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator(
				`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
			)
		).toBeVisible();
		const original = await stylesheetEvidence(
			page,
			testInfo,
			'original-build'
		);
		const css = fs.readFileSync(
			path.join(
				process.env.MODULA_E2E_LITE_ROOT,
				'assets/css/front',
				bootstrapCss
			),
			'utf8'
		);
		await evidence.withBootstrapStylesheetBuild(
			`${css}\n:root{--modula-e2e-build:updated}\n`,
			async () => {
				await page.goto(catalog.pages.visible);
				await expect(
					page.locator(
						`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
					)
				).toBeVisible();
				const changed = await stylesheetEvidence(
					page,
					testInfo,
					'changed-build'
				);
				expectSingleStylesheet(changed);
				expect(changed.sheets[0]).not.toBe(original.sheets[0]);
				expect(
					await page.evaluate(() =>
						getComputedStyle(
							document.documentElement
						).getPropertyValue('--modula-e2e-build')
					)
				).toBe('updated');
			}
		);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('a failed bootstrap stylesheet can retry and reveal a styled gallery', async ({
	evidence,
}, testInfo) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await preloadOnly(page, catalog.pages.visible);
		await page.route(bootstrapRoute, (route) => route.abort('failed'));
		await page.goto(catalog.pages.visible);
		const root = page.locator(`#modula-${catalog.galleries.visible.id}`);
		await expect(
			root.getByRole('button', { name: 'Try again', exact: true })
		).toBeVisible();
		await expect(root.locator('.modula-masonry-react')).toHaveCount(0);
		await page.unroute(bootstrapRoute);
		await root
			.getByRole('button', { name: 'Try again', exact: true })
			.click();
		await expect(root.locator('.modula-masonry-react')).toBeVisible();
		await expect(root.locator('.modula-masonry-react')).toHaveCSS(
			'display',
			'flex'
		);
		const styles = await stylesheetEvidence(
			page,
			testInfo,
			'stylesheet-retry'
		);
		expect(styles.sheets).toHaveLength(1);
		expect(
			styles.links.filter((link) => link.rel === 'stylesheet')
		).toHaveLength(1);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('saved editor preview and mixed-page visitor retain layout and the same CSS build', async ({
	page,
	evidence,
}, testInfo) => {
	const gallery = catalog.galleries.hiddenTab;
	await page.goto(gallery.editor);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const gutter = page.getByRole('spinbutton', { name: 'Value', exact: true });
	const nextGutter = Number(await gutter.inputValue()) === 19 ? 21 : 19;
	const saved = page.waitForResponse(
		(response) =>
			response
				.url()
				.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
			(response.request().method() === 'PATCH' ||
				response.request().headers()['x-http-method-override'] ===
					'PATCH') &&
			response.ok()
	);
	await gutter.fill(String(nextGutter));
	await gutter.press('Tab');
	await saved;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
	await expect(page.locator('main .modula-masonry-react')).toHaveCSS(
		'gap',
		`${nextGutter}px`
	);
	await page.goto(gallery.editor);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	await expect(gutter).toHaveValue(String(nextGutter));
	await expect(page.locator('main .modula-masonry-react')).toHaveCSS(
		'gap',
		`${nextGutter}px`
	);
	const preview = await stylesheetEvidence(
		page,
		testInfo,
		'saved-reopened-preview'
	);
	await evidence.capture(page, 'saved-reopened-preview');
	for (const width of [1440, 390]) {
		const visitor = await evidence.anonymous({ width, height: 1000 });
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.mixed);
			const beta = publicPage.locator(`#modula-${gallery.id}`);
			await expect(beta.locator('.modula-masonry-react')).toBeVisible();
			const classic = publicPage.locator(
				`#jtg-${catalog.galleries.classic.id}`
			);
			await expect(classic).toBeVisible();
			await expect(classic.locator('.modula-item')).toHaveCount(6);
			await expect(
				classic.locator('.modula-gallery-react-host')
			).toHaveCount(0);
			if (width === 1440) {
				await expect(beta.locator('.modula-masonry-react')).toHaveCSS(
					'gap',
					`${nextGutter}px`
				);
			}
			const styles = await stylesheetEvidence(
				publicPage,
				testInfo,
				`mixed-visitor-${width}`
			);
			expectSingleStylesheet(styles);
			expect(styles.sheets).toEqual(preview.sheets);
			await evidence.capture(publicPage, `mixed-visitor-${width}`);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	}
});
