const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

for (const width of [1440, 390]) {
	test(`Beta galleries and comments use one React renderer on cold and cached loads at ${width}px`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous({ width, height: 1000 });
		await visitor.addInitScript(() => {
			// React's public DevTools integration records each loaded renderer.
			window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
				supportsFiber: true,
				renderers: new Map(),
				inject(renderer) {
					const id = this.renderers.size + 1;
					this.renderers.set(id, renderer);
					return id;
				},
				onCommitFiberRoot() {},
				onCommitFiberUnmount() {},
			};
		});
		try {
			const page = await visitor.newPage();
			const errors = [];
			page.on('pageerror', (error) => errors.push(error.message));
			for (const load of ['cold', 'cached']) {
				await page.goto(catalog.pages.catalog);
				await expect(
					page.locator(
						`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
					)
				).toBeVisible();
				const root = page.locator(
					`#modula-${catalog.galleries.farOffscreen.id}`
				);
				await root.scrollIntoViewIfNeeded();
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				await root.locator('.modula-item-link').first().click();
				await expect(
					page.locator('.modula-fancybox-container')
				).toBeVisible();
				if (process.env.MODULA_E2E_MODE === 'pro') {
					await expect(
						page.locator('.modula-comments-header')
					).toBeVisible();
					const editor = page.locator(
						'.modula-comments-editor-textarea'
					);
					await editor.fill(
						'Dependency sharing preserves comment editing.'
					);
					await expect(editor).toHaveValue(
						'Dependency sharing preserves comment editing.'
					);
				}
				const renderers = await page.evaluate(() =>
					Array.from(
						window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.values(),
						(renderer) => ({
							version: renderer.version,
							package: renderer.rendererPackageName,
						})
					)
				);
				await testInfo.attach(`${load}-renderers`, {
					body: JSON.stringify(renderers),
					contentType: 'application/json',
				});
				expect(renderers).toHaveLength(1);
				await page.keyboard.press('Escape');
				await expect(
					page.locator('.modula-fancybox-container')
				).toHaveCount(0);
			}
			expect(errors).toEqual([]);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

for (const host of ['absent', 'older', 'mismatched']) {
	test(`the standalone gallery works with an ${host} host React pair`, async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			const errors = [];
			page.on('pageerror', (error) => errors.push(error.message));
			// Keep real shortcode markup/data/assets, but isolate the host's scripts.
			// This models Lite pages that do not enqueue WordPress React at all.
			await page.route(catalog.pages.visible, async (route) => {
				const response = await route.fetch();
				const html = (await response.text()).replace(
					/<script\b[^>]*>[\s\S]*?<\/script>/gi,
					(script) =>
						/type=['"]application\/json['"]|id=['"]modula-gallery-js(?:-extra)?['"]/.test(
							script
						)
							? script
							: ''
				);
				await route.fulfill({ response, body: html });
			});
			await page.addInitScript((kind) => {
				if (kind !== 'absent') {
					window.React = {
						version: kind === 'older' ? '16.14.0' : '18.3.1',
						useSyncExternalStore() {},
					};
					window.ReactDOM = {
						version: '16.14.0',
						createRoot() {
							throw new Error('Incompatible renderer used');
						},
					};
				}
			}, host);
			let failedRuntimeUrl;
			if (host === 'absent') {
				await page.route(
					'**/assets/js/front/*.modula-gallery.js',
					(route) => {
						if (!failedRuntimeUrl) {
							failedRuntimeUrl = route.request().url();
							return route.abort('failed');
						}
						return route.continue();
					}
				);
			}
			await page.goto(catalog.pages.visible);
			const root = page.locator(
				`#modula-${catalog.galleries.visible.id}`
			);
			if (host === 'absent') {
				await root.getByRole('button', { name: 'Try again' }).click();
				expect(failedRuntimeUrl).toBeTruthy();
			}
			await expect(root.locator('.modula-masonry-react')).toBeVisible();
			await expect(root.locator('.modula-item')).toHaveCount(6);
			expect(
				await page.evaluate(() => window.React?.version ?? null)
			).toBe(
				host === 'absent'
					? null
					: host === 'older'
						? '16.14.0'
						: '18.3.1'
			);
			expect(errors).toEqual([]);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

if (process.env.MODULA_E2E_MODE === 'pro') {
	test('comments can be disabled and enabled through save, reopen and an anonymous gallery', async ({
		page,
		evidence,
	}) => {
		const gallery = catalog.galleries.farOffscreen;
		async function openEditor() {
			await page.goto(gallery.editor);
			await page
				.getByRole('button', {
					name: 'Open Interaction settings',
					exact: true,
				})
				.click();
		}
		await openEditor();
		for (const enabled of [false, true]) {
			const toggle = page.getByRole('switch', {
				name: 'Enable comments',
				exact: true,
			});
			const saved = page.waitForResponse(
				async (response) =>
					response
						.url()
						.includes(
							`/modula/v2/gallery/${gallery.id}/settings`
						) &&
					(response.request().method() === 'PATCH' ||
						response.request().headers()[
							'x-http-method-override'
						] === 'PATCH') &&
					response.ok() &&
					[true, 1, '1'].includes(
						(await response.json()).comments.commentStatus
					) === enabled
			);
			await toggle.click();
			await saved;
			await expect(
				page.locator('.modula-gallery-takeover__topbar-save-status')
			).toHaveText('Saved');
			await openEditor();
			await expect(toggle).toHaveAttribute(
				'aria-checked',
				String(enabled)
			);
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
			const visitor = await evidence.anonymous();
			try {
				const publicPage = await visitor.newPage();
				const commentAssets = [];
				publicPage.on('request', (request) => {
					if (/gallery-comments/.test(request.url()))
						commentAssets.push(request.url());
				});
				await publicPage.goto(catalog.pages.comments);
				const root = publicPage.locator(`#modula-${gallery.id}`);
				await root.scrollIntoViewIfNeeded();
				await expect(
					root.locator('.modula-masonry-react')
				).toBeVisible();
				await root.locator('.modula-item-link').first().click();
				await expect(
					publicPage.locator('.modula-fancybox-container')
				).toBeVisible();
				await expect(
					publicPage.locator('.modula-comments-header')
				).toHaveCount(enabled ? 1 : 0);
				if (!enabled) expect(commentAssets).toEqual([]);
				await evidence.capture(
					publicPage,
					`comments-enabled-${enabled}`
				);
				await publicPage.keyboard.press('Escape');
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
	});
}
