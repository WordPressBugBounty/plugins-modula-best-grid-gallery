const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

for (const width of [1440, 390]) {
	test(`small detector defers mounting on a dormant-only page and starts a visible hero at ${width}px`, async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous({ width, height: 1000 });
		try {
			const page = await visitor.newPage();
			const requests = [];
			page.on('request', (request) => {
				if (
					/\/assets\/js\/front\/.*modula-gallery.*\.js/.test(
						request.url()
					)
				) {
					requests.push(request.url());
				}
			});
			const entryResponse = page.waitForResponse((response) =>
				/\/assets\/js\/front\/modula-gallery\.js(?:\?|$)/.test(
					response.url()
				)
			);
			await page.goto(catalog.pages.slider);
			await page.waitForFunction(
				() => typeof window.ModulaGalleryInit === 'function'
			);
			const entry = await (await entryResponse).body();
			await page.waitForTimeout(1000);
			await expect(
				page.locator('.modula-gallery-initialized')
			).toHaveCount(0);
			expect(requests).toHaveLength(1);
			const bytes = {
				decoded: entry.length,
				gzip: gzipSync(entry).length,
			};
			await testInfo.attach('dormant-detector-network-and-bytes', {
				body: JSON.stringify({ requests, bytes }, null, 2),
				contentType: 'application/json',
			});
			expect(bytes.gzip).toBeLessThanOrEqual(20 * 1024);
			// A fresh page has no activation gesture or warm gallery implementation.
			const hero = await visitor.newPage();
			await hero.goto(catalog.pages.visible);
			await expect(
				hero.locator(
					`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
				)
			).toBeVisible();
			await expect(hero.locator('.modula-item')).toHaveCount(6);
			await evidence.capture(hero, `small-loader-hero-${width}`);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

if (process.env.MODULA_E2E_MODE === 'pro') {
	test('Parallax layout saves, reopens and mounts through the small detector', async ({
		page,
		evidence,
	}) => {
		const gallery = catalog.galleries.hiddenTab;
		async function chooseLayout(current, next, type) {
			await page
				.getByRole('button', { name: current, exact: true })
				.click();
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
					(await response.json()).general.type === type
			);
			await page.getByRole('option', { name: next, exact: true }).click();
			await saved;
			await expect(
				page.locator('.modula-gallery-takeover__topbar-save-status')
			).toHaveText('Saved');
		}
		await page.goto(gallery.editor);
		await chooseLayout('Masonry', 'Parallax', 'parallax-masonry');
		try {
			await expect(
				page.locator('main .modula-parallax-masonry')
			).toBeVisible();
			await page.reload();
			await expect(
				page.getByRole('button', { name: 'Parallax', exact: true })
			).toBeVisible();
			await expect(
				page.locator('main .modula-parallax-masonry')
			).toBeVisible();
			await evidence.capture(page, 'parallax-preview-reopened');
			for (const width of [1440, 390]) {
				const visitor = await evidence.anonymous({
					width,
					height: 1000,
				});
				try {
					const publicPage = await visitor.newPage();
					await publicPage.goto(catalog.pages.mixed);
					const root = publicPage.locator(`#modula-${gallery.id}`);
					await root.scrollIntoViewIfNeeded();
					await expect(
						root.locator('.modula-parallax-masonry')
					).toBeVisible();
					await expect(
						root.locator('.modula-item').first()
					).toBeVisible();
					await evidence.capture(
						publicPage,
						`parallax-visitor-${width}`
					);
				} finally {
					await evidence.closeVisitor(visitor);
				}
			}
		} finally {
			await page.goto(gallery.editor);
			await chooseLayout('Parallax', 'Masonry', 'grid');
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
		}
	});
}
