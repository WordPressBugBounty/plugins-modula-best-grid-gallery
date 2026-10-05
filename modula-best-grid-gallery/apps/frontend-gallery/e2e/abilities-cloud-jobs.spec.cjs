const { test, expect } = require('./evidence.cjs');
const fs = require('node:fs');
const path = require('node:path');
const fixture = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'abilities-cloud-jobs-http.json'
		)
	)
);
test.skip(
	process.env.MODULA_E2E_MODE !== 'pro',
	'Storage requires Compatible Pro; native and HTTP verify the Lite gate.'
);
test('library offload keeps gallery identity and serves remote bytes after editor reopen', async ({
	page,
	evidence,
}) => {
	await page.goto(fixture.gallery.editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const saved = await page.evaluate(
		(id) =>
			window.wp.apiFetch({
				path: `/modula/v2/gallery/${id}/settings`,
				method: 'PATCH',
				data: { layout: { gutter: 17 } },
			}),
		fixture.gallery.id
	);
	expect(saved).toBeTruthy();
	await page.reload();
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	const visitor = await evidence.anonymous();
	const publicPage = await visitor.newPage();
	try {
		await publicPage.goto(fixture.gallery.page_url);
		const root = publicPage.locator(`#modula-${fixture.gallery.id}`);
		await root.scrollIntoViewIfNeeded();
		const img = root.locator('img').first();
		await expect(img).toBeVisible();
		await expect
			.poll(() => img.evaluate((i) => i.complete && i.naturalWidth > 0))
			.toBe(true);
		const source = await img.evaluate((i) => i.currentSrc || i.src);
		expect(source).not.toContain('localhost:10003');
		await evidence.flush();
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
