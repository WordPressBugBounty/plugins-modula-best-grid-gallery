const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

if (process.env.MODULA_E2E_MODE === 'pro') {
	for (const width of [1440, 390]) {
		test(`comments wait for first lightbox use and reuse assets at ${width}px`, async ({
			evidence,
		}, testInfo) => {
			const visitor = await evidence.anonymous(
				{ width, height: 1000 },
				{ hasTouch: width === 390 }
			);
			try {
				const page = await visitor.newPage();
				const requests = [];
				page.on('request', (request) => requests.push(request.url()));
				await page.goto(catalog.pages.comments);
				const root = page.locator(
					`#modula-${catalog.galleries.farOffscreen.id}`
				);
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				const initial = requests.slice();
				await testInfo.attach('navigation-requests', {
					body: JSON.stringify(initial),
					contentType: 'application/json',
				});
				expect(
					initial.filter((url) =>
						/gallery-comments\/(?:index\.(?:css|js)|.*\.css)|dashicons/i.test(
							url
						)
					)
				).toEqual([]);
				const trigger = root.locator(
					`.modula-item-link[data-image-id="${catalog.attachments[1].id}"]`
				);
				await trigger.focus();
				await page.keyboard.press('Enter');
				await expect(
					page.locator('.modula-fancybox-container')
				).toBeVisible();
				// Exercise the adverse cascade: comments stylesheet follows lightbox styles.
				await page.evaluate(() => {
					const styles = document.querySelector(
						'link[rel="stylesheet"][href*="/gallery-comments/beta/"]'
					);
					if (!styles)
						throw new Error('Comments stylesheet was not loaded');
					document.head.appendChild(styles);
				});
				await expect(
					page.locator(
						'.fancybox__slide.is-selected img:not(.is-clone)'
					)
				).toBeVisible();
				await expect(
					page.locator('.modula-comments-header')
				).toBeVisible();
				await expect(
					page.locator('.modula-comments-editor-textarea')
				).toBeVisible();
				if (width < 600)
					await page.locator('[data-modula-toolbar-more]').click();
				await expect(
					page.locator('#modula-comments-toggle svg')
				).toBeVisible();
				if (width < 600)
					await page.locator('[data-modula-toolbar-more]').click();
				await page
					.locator('.modula-comments-editor-textarea')
					.fill('Isolated draft');
				const loaded = requests.filter((url) =>
					/gallery-comments/.test(url)
				);
				await page.keyboard.press('Escape');
				await expect(
					page.locator('.modula-fancybox-container')
				).toHaveCount(0);
				await expect(trigger).toBeFocused();
				await trigger.click();
				await expect(
					page.locator('.modula-comments-header')
				).toBeVisible();
				expect(
					requests.filter((url) => /gallery-comments/.test(url))
				).toEqual(loaded);
				await testInfo.attach('first-use-requests', {
					body: JSON.stringify(requests.slice(initial.length)),
					contentType: 'application/json',
				});
				await evidence.capture(page, `comments-${width}`);
				await page.keyboard.press('Escape');
			} finally {
				await evidence.closeVisitor(visitor);
			}
		});
	}
}

if (process.env.MODULA_E2E_MODE === 'lite') {
	test('Lite opens the lightbox without comments assets', async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			const requests = [];
			page.on('request', (request) => requests.push(request.url()));
			await page.goto(catalog.pages.comments);
			await page
				.locator(
					`#modula-${catalog.galleries.farOffscreen.id} .modula-item-link`
				)
				.first()
				.click();
			await expect(
				page.locator('.modula-fancybox-container')
			).toBeVisible();
			expect(
				requests.filter((url) => /gallery-comments/.test(url))
			).toEqual([]);
			await page.keyboard.press('Escape');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

if (process.env.MODULA_E2E_MODE === 'pro') {
	for (const resource of ['js', 'css']) {
		test(`a failed comments ${resource} request retries the selected keyboard action`, async ({
			evidence,
		}) => {
			const visitor = await evidence.anonymous();
			try {
				const page = await visitor.newPage();
				await page.goto(catalog.pages.comments);
				const root = page.locator(
					`#modula-${catalog.galleries.farOffscreen.id}`
				);
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				let failedUrl;
				const attempts = [];
				await page.route(
					`**/gallery-comments/beta/*.${resource}`,
					(route) => {
						attempts.push(route.request().url());
						if (!failedUrl) {
							failedUrl = route.request().url();
							return route.abort('failed');
						}
						return route.continue();
					}
				);
				const trigger = root.locator(
					`.modula-item-link[data-image-id="${catalog.attachments[2].id}"]`
				);
				await trigger.press('Enter');
				const retry = root.getByRole('button', {
					name: 'Retry lightbox',
				});
				await expect(retry).toBeVisible();
				await expect(
					page.locator('.modula-fancybox-container')
				).toHaveCount(0);
				await retry.click();
				await expect(
					page.locator('.modula-comments-header')
				).toBeVisible();
				await expect(
					page.locator(
						'.fancybox__slide.is-selected img:not(.is-clone)'
					)
				).toHaveAttribute('src', /image-3\.jpg/);
				expect(
					attempts.filter((url) => url === failedUrl)
				).toHaveLength(2);
				await page.keyboard.press('Escape');
				await expect(trigger).toBeFocused();
			} finally {
				await evidence.closeVisitor(visitor);
			}
		});
	}

	test('destroying a gallery cancels a pending comments open', async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous();
		let release;
		const held = new Promise((resolve) => {
			release = resolve;
		});
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.comments);
			const root = page.locator(
				`#modula-${catalog.galleries.farOffscreen.id}`
			);
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			let attempts = 0;
			await page.route('**/gallery-comments/beta/*.js', async (route) => {
				attempts++;
				await held;
				await route.continue();
			});
			await root.locator('.modula-item-link').first().click();
			await expect.poll(() => attempts).toBeGreaterThan(0);
			await page.evaluate(
				(id) => window.ModulaGalleryDestroy(id),
				`modula-${catalog.galleries.farOffscreen.id}`
			);
			release();
			await page.waitForLoadState('networkidle');
			await expect(
				page.locator('.modula-fancybox-container')
			).toHaveCount(0);
			await expect(page.locator('.modula-comments-header')).toHaveCount(
				0
			);
		} finally {
			release();
			await evidence.closeVisitor(visitor);
		}
	});

	test('deferred comments preserve guest submission and privileged API permissions', async ({
		page,
		evidence,
	}) => {
		const gallery = catalog.galleries.farOffscreen;
		const visitor = await evidence.anonymous();
		const api = `/modula-comments/v1/galleries/${gallery.id}/comments`;
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.comments);
			await publicPage
				.locator(
					`#modula-${gallery.id} .modula-item-link[data-image-id="${catalog.attachments[1].id}"]`
				)
				.click();
			await expect(
				publicPage.locator('.modula-comments-editor-textarea')
			).toBeVisible();
			await publicPage
				.locator('#modula-comment-name')
				.fill('E2E visitor');
			await publicPage
				.locator('#modula-comment-email')
				.fill('modula-e2e@example.invalid');
			await publicPage
				.locator('.modula-comments-editor-textarea')
				.fill(
					`Isolated comment ${process.env.MODULA_E2E_RUN_DIR.split('/').pop()}`
				);
			const posted = publicPage.waitForResponse(
				(response) =>
					response.url().includes(api) &&
					response.request().method() === 'POST'
			);
			await publicPage
				.getByRole('button', { name: 'Post comment', exact: true })
				.click();
			const response = await posted;
			expect(response.ok()).toBe(true);
			const result = await response.json();
			expect(result.success).toBe(true);
			expect(result.data.status).toBe(201);
			expect(response.request().postDataJSON().image).toBe(
				catalog.attachments[1].id
			);
			await expect(
				publicPage.locator('.modula-comments-response-success')
			).toBeVisible();
			const denied = await visitor.request.get(
				`/wp-json${api}?status=hold&image=${catalog.attachments[1].id}`
			);
			expect(denied.status()).toBe(401);
			await page.goto(gallery.editor);
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
			const allowed = await page.evaluate(async (route) => {
				const result = await window.wp.apiFetch({
					path: route,
					parse: false,
				});
				return result.status;
			}, `${api}?status=hold&image=${catalog.attachments[1].id}`);
			expect(allowed).toBe(200);
			await publicPage.keyboard.press('Escape');
		} finally {
			await page.close();
			await evidence.closeVisitor(visitor);
		}
	});
}
