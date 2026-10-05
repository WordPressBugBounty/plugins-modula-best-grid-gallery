const { test, expect } = require('./evidence.cjs');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const fixture = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'abilities-storage-http.json'
		)
	)
);
async function expectReplacementPixels(img) {
	await expect
		.poll(() =>
			img.evaluate((image) => image.complete && image.naturalWidth > 0)
		)
		.toBe(true);
	const rgb = await img.evaluate((image) => {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(
			image,
			image.naturalWidth - 1,
			image.naturalHeight - 1,
			1,
			1,
			0,
			0,
			1,
			1
		);
		return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
	});
	// Independent known color of synthetic E2E image 1; image 2 is (80,80,150).
	[55, 65, 165].forEach((value, index) =>
		expect(Math.abs(rgb[index] - value)).toBeLessThanOrEqual(4)
	);
}
test('shared file replacement survives both editors, Media Library and anonymous rendering', async ({
	page,
	evidence,
}) => {
	for (const gallery of fixture.galleries) {
		await page.goto(gallery.editor_url);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		const rows = await page.evaluate(
			(id) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
				}),
			gallery.id
		);
		expect(JSON.stringify(rows)).toContain('Preserved shared title');
		await expectReplacementPixels(
			page.locator('main .modula-masonry-react img').first()
		);
		await page.reload();
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	}
	await page.goto(
		`http://localhost:10003/wp-admin/post.php?post=${fixture.id}&action=edit`
	);
	await expect(page.locator('#title')).toHaveValue('Preserved shared title');
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(fixture.page);
		for (const gallery of fixture.galleries) {
			const root = publicPage.locator(`#modula-${gallery.id}`);
			await root.scrollIntoViewIfNeeded();
			const img = root.locator('img').first();
			await expect(img).toBeVisible();
			await expectReplacementPixels(img);
			await expect
				.poll(() =>
					img.evaluate(
						(image) => image.complete && image.naturalWidth > 0
					)
				)
				.toBe(true);
		}
		const original = await publicPage.request.get(
			`http://localhost:10003/wp-json/wp/v2/media/${fixture.id}`
		);
		expect(original.status()).toBe(200);
		const media = await original.json();
		const bytes = await publicPage.request.get(media.source_url);
		expect(
			crypto
				.createHash('sha256')
				.update(await bytes.body())
				.digest('hex')
		).toBe(fixture.sha256);
		await evidence.capture(publicPage, 'replacement-two-galleries');
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

if (fixture.bound) {
	test('MCP bound gallery preserves source identity through editor save, reopen and anonymous display', async ({
		page,
		evidence,
	}) => {
		const bound = fixture.bound;
		await page.goto(bound.editor_url);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		const before = await page.evaluate(
			(id) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
				}),
			bound.id
		);
		expect(JSON.stringify(before)).toContain('Bound shared title');
		const result = await page.evaluate(
			(id) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/settings`,
					method: 'PATCH',
					data: { layout: { gutter: 17 } },
				}),
			bound.id
		);
		expect(result).toBeTruthy();
		await page.reload();
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		const after = await page.evaluate(
			(id) =>
				window.wp.apiFetch({
					path: `/modula/v2/gallery/${id}/bootstrap?context=settings_editor`,
				}),
			bound.id
		);
		expect(JSON.stringify(after)).toContain('Bound shared title');
		await evidence.capture(page, 'bound-editor-reopen');
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(bound.page);
			const root = publicPage.locator(`#modula-${bound.id}`);
			await root.scrollIntoViewIfNeeded();
			await expect(root.locator('img')).toHaveCount(2);
			for (const img of await root.locator('img').all()) {
				await expect(img).toBeVisible();
				await expect
					.poll(() =>
						img.evaluate((el) => el.complete && el.naturalWidth > 0)
					)
					.toBe(true);
			}
			await evidence.capture(
				publicPage,
				'bound-anonymous-source-members'
			);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}
