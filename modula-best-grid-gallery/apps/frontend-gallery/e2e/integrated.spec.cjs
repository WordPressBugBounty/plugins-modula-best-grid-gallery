const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

test('a private Beta gallery is visible only to an authorized visitor', async ({
	page,
	evidence,
}) => {
	const id = catalog.galleries.privateAccess.id;
	await page.goto(catalog.pages.privateAccess);
	await expect(page.locator(`#modula-${id} .modula-item`)).toHaveCount(6);
	const visitor = await evidence.anonymous();
	try {
		const anonymous = await visitor.newPage();
		const response = await anonymous.goto(catalog.pages.privateAccess);
		await expect(anonymous.locator(`#modula-${id}`)).toHaveCount(0);
		expect(await response.text()).not.toContain(
			`data-modula-gallery-id="modula-${id}"`
		);
		const denied = await visitor.request.get(
			`/wp-json/modula/v2/gallery/${id}/bootstrap`
		);
		expect([401, 403, 404]).toContain(denied.status());
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

if (process.env.MODULA_E2E_MODE === 'pro') {
	test('saved video lightbox plays from a cold page with reduced motion', async ({
		page,
		evidence,
	}) => {
		const gallery = catalog.galleries.videoSlider;
		const saved = () =>
			page.waitForResponse(
				(response) =>
					response
						.url()
						.includes(
							`/modula/v2/gallery/${gallery.id}/settings`
						) &&
					(response.request().method() === 'PATCH' ||
						response.request().headers()[
							'x-http-method-override'
						] === 'PATCH') &&
					response.ok()
			);
		await page.goto(gallery.editor);
		await page.getByRole('button', { name: 'Slider', exact: true }).click();
		const switched = saved();
		await page
			.getByRole('option', { name: 'Masonry', exact: true })
			.click();
		await switched;
		try {
			await page
				.getByRole('button', {
					name: 'Open Lightbox settings',
					exact: true,
				})
				.click();
			const clickBehavior = page
				.getByRole('region', {
					name: 'What happens when an image is clicked',
					exact: true,
				})
				.getByRole('combobox');
			const enabled = saved();
			await clickBehavior.selectOption('fancybox');
			await enabled;
			await page.reload();
			await page
				.getByRole('button', {
					name: 'Open Lightbox settings',
					exact: true,
				})
				.click();
			await expect(clickBehavior).toHaveValue('fancybox');
			const visitor = await evidence.anonymous(
				{ width: 390, height: 844 },
				{ deviceScaleFactor: 2 }
			);
			try {
				const publicPage = await visitor.newPage();
				await publicPage.goto(catalog.pages.videoSlider);
				await publicPage
					.locator('.modula-item-link[data-video-url]')
					.first()
					.click();
				const lightbox = publicPage.locator(
					'.modula-fancybox-container'
				);
				await expect(lightbox).toBeVisible();
				await expect(lightbox).toHaveClass(
					/modula-respect-reduced-motion/
				);
				const video = lightbox.locator('video');
				await expect(video).toBeVisible();
				await expect(video).toHaveAttribute('controls', '');
				await video.focus();
				await video.press('Space');
				await expect
					.poll(() => video.evaluate((el) => el.currentTime))
					.toBeGreaterThan(0);
				await evidence.capture(publicPage, 'video-lightbox-playing');
				await publicPage.keyboard.press('Escape');
				await expect(lightbox).toHaveCount(0);
			} finally {
				await evidence.closeVisitor(visitor);
			}
		} finally {
			// Other Slider checks share this fixture; restore its saved layout.
			await page.goto(gallery.editor);
			await page
				.getByRole('button', { name: 'Masonry', exact: true })
				.click();
			const restored = saved();
			await page
				.getByRole('option', { name: 'Slider', exact: true })
				.click();
			await restored;
		}
	});

	test('a cold lightbox saves the selected unprotected image to disk', async ({
		evidence,
	}, testInfo) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.download);
			await page.locator('.modula-item-link').first().click();
			const lightbox = page.locator('.modula-fancybox-container');
			await expect(lightbox).toBeVisible();
			const pending = page.waitForEvent('download');
			await lightbox.getByTitle('Download', { exact: true }).click();
			const download = await pending;
			expect(await download.failure()).toBeNull();
			const target = testInfo.outputPath('download.jpg');
			await download.saveAs(target);
			const original = await visitor.request.get(
				catalog.attachments[0].url
			);
			expect(fs.readFileSync(target).equals(await original.body())).toBe(
				true
			);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}
