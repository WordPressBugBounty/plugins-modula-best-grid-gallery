const { test, expect } = require('./evidence.cjs');
const fs = require('node:fs');
const path = require('node:path');
const fixture = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'abilities-css-ai-http.json'
		)
	)
);
test('explicit CSS survives editor save/reopen and styles the anonymous gallery', async ({
	page,
	evidence,
}) => {
	expect(fixture.passed).toBe(true);
	expect(fixture.anonymous_denied).toBe(true);
	await page.goto(fixture.gallery.editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const bootstrap = () =>
		page.evaluate(
			(id) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
				}),
			fixture.gallery.id
		);
	expect(JSON.stringify(await bootstrap())).toContain(
		JSON.stringify(fixture.code).slice(1, -1)
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
		fixture.gallery.id
	);
	await page.reload();
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	expect(JSON.stringify(await bootstrap())).toContain(
		JSON.stringify(fixture.code).slice(1, -1)
	);
	await evidence.capture(page, 'css-applied-editor');
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(fixture.page);
		const root = publicPage.locator(`#modula-${fixture.gallery.id}`);
		await expect(root).toBeVisible();
		await expect(root).toHaveCSS('outline-width', '7px');
		await expect(root).toHaveCSS('outline-color', 'rgb(17, 34, 51)');
		const img = root.locator('img').first();
		await expect
			.poll(() =>
				img.evaluate((el) => el.complete && el.naturalWidth > 0)
			)
			.toBe(true);
		await evidence.capture(publicPage, 'css-applied-visitor');
	} finally {
		await visitor.close();
	}
});
