const { test, expect } = require('./evidence.cjs');
const fs = require('node:fs');
const path = require('node:path');
const fixture = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'abilities-storage-http.json'
		)
	)
);
test('cloud shared text survives Media Library, both editors and public markup', async ({
	page,
	evidence,
}) => {
	if (!fixture.cloud_image) {
		await page.goto(fixture.galleries[0].editor_url);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		await evidence.capture(
			page,
			'local-fallback-without-storage-entitlement'
		);
		return;
	}
	const cloud = fixture.cloud_image;
	await page.goto(
		`http://localhost:10003/wp-admin/post.php?post=${cloud.id}&action=edit`
	);
	await expect(page.locator('#attachment_alt')).toHaveValue(
		'Private cloud MCP alt'
	);
	for (const id of cloud.galleries) {
		await page.goto(
			`http://localhost:10003/wp-admin/post.php?post=${id}&action=edit`
		);
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		const read = () =>
			page.evaluate(
				(galleryId) =>
					window.wp.apiFetch({
						path: `/modula/v2/gallery/${galleryId}/bootstrap?context=settings_editor`,
					}),
				id
			);
		expect(JSON.stringify(await read())).toContain('Private cloud MCP alt');
		await page.reload();
		await expect(page.locator('main .modula-masonry-react')).toBeVisible();
		expect(JSON.stringify(await read())).toContain('Private cloud MCP alt');
	}
	const visitor = await evidence.anonymous();
	try {
		const publicPage = await visitor.newPage();
		await publicPage.goto(cloud.page);
		for (const id of cloud.galleries) {
			const image = publicPage.locator(`#modula-${id} img`).first();
			await expect(image).toHaveAttribute('alt', 'Private cloud MCP alt');
		}
		await evidence.capture(publicPage, 'private-cloud-shared-text');
	} finally {
		await evidence.closeVisitor(visitor);
	}
});
