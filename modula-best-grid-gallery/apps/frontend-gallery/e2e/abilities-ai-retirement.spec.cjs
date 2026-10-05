// Reuse historical proposal application and two-gallery public/editor checks.
require('./abilities-shared-text-browser.cjs')();
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

test('website Generate still reaches the existing handler and its localhost refusal', async ({
	page,
	evidence,
}) => {
	// Only the browser's availability response is controlled, to expose the real button.
	// Generation is a real HTTP request to the unchanged WordPress handler; no provider call.
	await page.route('**/modula-ai-image-descriptor/v1/ai-settings*', (route) =>
		route.fulfill({
			json: {
				unavailable_on_localhost: false,
				readonly: { valid_key: true },
			},
		})
	);
	await page.goto(fixture.galleries[0].editor_url);
	await expect(page.locator('main .modula-masonry-react')).toBeVisible();
	await page
		.getByRole('button', { name: 'Select image to edit', exact: true })
		.first()
		.click();
	const generate = page.locator(
		'.modula-gallery-item-edit-panel__ai-toolbar button'
	);
	await expect(generate).toBeEnabled();
	const responsePromise = page.waitForResponse(
		(response) =>
			response.url().includes('/generate-alt-text') &&
			response.request().method() === 'POST'
	);
	await generate.click();
	const response = await responsePromise;
	expect(response.request().postDataJSON()).toMatchObject({
		attachment_id: fixture.attachment_id,
		action: 'generate',
	});
	expect(response.status()).toBe(403);
	expect((await response.json()).code).toBe(
		'modula_ai_unavailable_localhost'
	);
	await expect(
		page
			.getByRole('alert')
			.filter({ hasText: 'Could not generate metadata' })
	).toBeVisible();
	await evidence.capture(page, 'website-ai-handler-preserved');
});
