const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

test('owned fixture pages do not inflate automatic theme navigation', async ({
	evidence,
}) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.visible);
		const links = await page
			.locator('.wp-block-page-list a')
			.evaluateAll((nodes) => nodes.map((node) => node.href));
		expect(links.length).toBeGreaterThan(0);
		expect(links.filter((url) => url.includes(catalog.run))).toEqual([]);
		await expect(
			page.locator(
				`#modula-${catalog.galleries.visible.id} .modula-masonry-react`
			)
		).toBeVisible();
		// The fixture filter must leave ordinary site pages unchanged.
		await page.goto('/');
		expect(
			await page
				.locator(`.wp-block-page-list a[href*="${catalog.run}"]`)
				.count()
		).toBeGreaterThan(0);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
