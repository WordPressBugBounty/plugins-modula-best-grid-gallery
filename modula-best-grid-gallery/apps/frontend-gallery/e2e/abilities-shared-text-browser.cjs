const { test, expect } = require('./evidence.cjs');
const fs = require('node:fs');
const path = require('node:path');
const fixture = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'abilities-instagram-ai-http.json'
		)
	)
);
module.exports = function registerSharedTextJourney() {
	test('explicit proposal application and imported identities survive two sharing editors and anonymous rendering', async ({
		page,
		evidence,
	}) => {
		expect(fixture.passed).toBe(true);
		expect(fixture.anonymous_denied).toBe(true);
		for (const gallery of fixture.galleries) {
			await page.goto(gallery.editor_url);
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
			const bootstrap = async () =>
				page.evaluate(
					(id) =>
						window.wp.apiFetch({
							path: `/modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
						}),
					gallery.id
				);
			expect(JSON.stringify(await bootstrap())).toContain(
				'Cached proposed alt'
			);
			await page.evaluate(
				(id) =>
					window.wp.apiFetch({
						path: `/modula/v2/gallery/${id}/settings`,
						method: 'PATCH',
						data: {
							layout: { gutter: 19 },
							performance: { lazyLoad: false },
						},
					}),
				gallery.id
			);
			await page.reload();
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
			const after = JSON.stringify(await bootstrap());
			expect(after).toContain('Cached proposed title');
			expect(after).toContain('Cached proposed alt');
		}
		if (fixture.live_gallery) {
			await page.goto(fixture.live_gallery.editor_url);
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
			await page.evaluate(
				(id) =>
					window.wp.apiFetch({
						path: `/modula/v2/gallery/${id}/settings`,
						method: 'PATCH',
						data: { performance: { lazyLoad: false } },
					}),
				fixture.live_gallery.id
			);
			await page.reload();
			await expect(
				page.locator('main .modula-masonry-react')
			).toBeVisible();
		}
		await evidence.capture(page, 'proposal-applied-editor');
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(fixture.page);
			for (const gallery of fixture.galleries) {
				const root = publicPage.locator(`#modula-${gallery.id}`);
				await root.scrollIntoViewIfNeeded();
				const img = root.locator('img').first();
				await expect(img).toBeVisible();
				await expect(img).toHaveAttribute('alt', 'Cached proposed alt');
				await expect
					.poll(() =>
						img.evaluate((el) => el.complete && el.naturalWidth > 0)
					)
					.toBe(true);
			}
			if (fixture.live_gallery) {
				await publicPage.goto(fixture.live_page);
				const liveImage = publicPage
					.locator(`#modula-${fixture.live_gallery.id} img`)
					.first();
				await expect(liveImage).toBeVisible();
				await expect
					.poll(() =>
						liveImage.evaluate(
							(el) => el.complete && el.naturalWidth > 0
						)
					)
					.toBe(true);
			}
			await evidence.capture(publicPage, 'proposal-applied-public');
		} finally {
			await visitor.close();
		}
	});
};
