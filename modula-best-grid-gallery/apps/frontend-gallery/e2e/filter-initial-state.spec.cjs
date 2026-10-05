const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);
const pro = process.env.MODULA_E2E_MODE === 'pro';

function root(page, name, classic = false) {
	return page.locator(
		`#${classic ? 'jtg' : 'modula'}-${catalog.galleries[name].id}`
	);
}
async function expectImages(gallery, numbers) {
	await expect(gallery.locator('.modula-item:visible')).toHaveCount(
		numbers.length
	);
	for (const number of numbers) {
		await expect(
			gallery.getByRole('img', {
				name: `E2E image ${number}`,
				exact: true,
			})
		).toBeVisible();
	}
}
async function expectSelected(gallery, value) {
	await expect(
		gallery.locator(`.filters a[data-filter="${value}"]`)
	).toHaveAttribute('aria-current', 'true');
	await expect(gallery.locator('.filters a.selected')).toHaveCount(1);
}

if (pro)
	test('saved default persists and applies before the first visitor action', async ({
		page,
		evidence,
	}) => {
		const gallery = catalog.galleries.filterDefault;
		const openFilters = async () => {
			await page.goto(gallery.editor);
			await page
				.getByRole('button', {
					name: 'Open Filters settings',
					exact: true,
				})
				.click();
		};
		await openFilters();
		const field = page
			.getByRole('region', { name: 'Selected by default', exact: true })
			.locator('select');
		const saved = page.waitForResponse(
			(response) =>
				response
					.url()
					.includes(`/modula/v2/gallery/${gallery.id}/settings`) &&
				(response.request().method() === 'PATCH' ||
					response.request().headers()['x-http-method-override'] ===
						'PATCH') &&
				response.ok()
		);
		await field.selectOption({ label: 'Red' });
		await saved;
		await expect(
			page.locator('.modula-gallery-takeover__topbar-save-status')
		).toHaveText('Saved');
		await openFilters();
		await expect(field.locator('option:checked')).toHaveText('Red');
		await evidence.capture(page, 'saved-default-reopened');
		const visitor = await evidence.anonymous();
		try {
			const publicPage = await visitor.newPage();
			await publicPage.goto(catalog.pages.filterDefault);
			const first = root(publicPage, 'filterDefault');
			const second = root(publicPage, 'filterFallback');
			await expectImages(first, [2, 4]);
			await expectSelected(first, 'Red');
			await expectImages(second, [1, 2, 3, 4]);
			await expectSelected(second, 'all');
			await first.locator('[data-filter="Blue"]').click();
			await expectImages(first, [1, 3]);
			await expectSelected(first, 'Blue');
			await first.locator('[data-filter="all"]').click();
			await expectImages(first, [1, 2, 3, 4]);
			await expectSelected(first, 'all');
			await expectImages(second, [1, 2, 3, 4]);
			await expectSelected(second, 'all');
			await evidence.capture(publicPage, 'independent-filter-results');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});

if (pro)
	test('server catalog starts on the saved filter with matching pages and totals', async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.filterServer);
			const gallery = root(page, 'filterServer');
			await expectSelected(gallery, 'Red');
			await expectImages(gallery, [2]);
			await expect(
				gallery.getByRole('button', { name: 'Page 3', exact: true })
			).toHaveCount(0);
			await gallery
				.getByRole('button', { name: 'Page 2', exact: true })
				.click();
			await expectImages(gallery, [4]);
			await gallery.locator('[data-filter="Blue"]').click();
			await expectImages(gallery, [1]);
			await gallery
				.getByRole('button', { name: 'Page 2', exact: true })
				.click();
			await expectImages(gallery, [3]);
			await gallery.locator('[data-filter="all"]').click();
			await expectSelected(gallery, 'all');
			await expect(
				gallery.getByRole('button', { name: 'Page 4', exact: true })
			).toBeVisible();
			await evidence.capture(page, 'server-filter-pages');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});

for (const name of pro
	? ['filterClassic', 'filterClassicFirst', 'filterBetaFirst']
	: []) {
	test(`classic controls remain usable on ${name}`, async ({ evidence }) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages[name]);
			const classic = root(page, 'filterClassic', true);
			await expect(classic).toHaveClass(/modula-gallery-initialized/);
			await expectImages(classic, [1, 2, 3, 4]);
			if (name !== 'filterClassic') {
				await expect(root(page, 'filterServer')).toHaveClass(
					/modula-gallery-chrome-ready/
				);
			}
			for (const label of ['All', 'Red', 'Blue']) {
				await expect(
					classic.getByRole('link', { name: label, exact: true })
				).toBeVisible();
			}
			await classic
				.getByRole('link', { name: 'Red', exact: true })
				.click();
			await expectImages(classic, [2, 4]);
			if (name !== 'filterClassic') {
				const beta = root(page, 'filterServer');
				await expectImages(beta, [2]);
				await beta.locator('[data-filter="Blue"]').click();
				await expectImages(beta, [1]);
				await expect(
					beta.getByRole('button', { name: 'Page 2', exact: true })
				).toBeVisible();
				await expectImages(classic, [2, 4]);
			}
			await evidence.capture(page, name);
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
}

if (!pro)
	test('Lite visitor retains the full All catalog', async ({ evidence }) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.filterDefault);
			await expectImages(root(page, 'filterDefault'), [1, 2, 3, 4]);
			await expectSelected(root(page, 'filterDefault'), 'all');
			await expectImages(root(page, 'filterFallback'), [1, 2, 3, 4]);
			await expectSelected(root(page, 'filterFallback'), 'all');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});

test('an unavailable default with All hidden does not select a named dropdown filter', async ({
	evidence,
}) => {
	const visitor = await evidence.anonymous();
	try {
		const page = await visitor.newPage();
		await page.goto(catalog.pages.filterDropdown);
		const gallery = root(page, 'filterDropdown');
		const select = gallery.getByRole('combobox', {
			name: 'Gallery filters',
		});
		await expectImages(gallery, [1, 2, 3, 4]);
		await expect(select.locator('option:checked')).toHaveText(
			'Select a filter'
		);
		await expect(select.locator('option:checked')).toBeDisabled();
		await expect(
			select.getByRole('option', { name: 'All', exact: true })
		).toHaveCount(0);
		await select.selectOption({ label: 'Blue' });
		await expectImages(gallery, [1, 3]);
		await expect(select.locator('option:checked')).toHaveText('Blue');
		await evidence.capture(page, 'hidden-all-dropdown');
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

if (pro)
	test('server load-more starts and appends within the saved default filter', async ({
		evidence,
	}) => {
		const visitor = await evidence.anonymous();
		try {
			const page = await visitor.newPage();
			await page.goto(catalog.pages.filterAppend);
			const gallery = root(page, 'filterAppend');
			await expectSelected(gallery, 'Red');
			await expectImages(gallery, [2]);
			await gallery.getByRole('button', { name: /Load more/i }).click();
			await expectImages(gallery, [2, 4]);
			await expect(
				gallery.getByRole('button', { name: /Load more/i })
			).toHaveCount(0);
			await gallery.locator('[data-filter="Blue"]').click();
			await expectImages(gallery, [1]);
			await gallery.getByRole('button', { name: /Load more/i }).click();
			await expectImages(gallery, [1, 3]);
			await evidence.capture(page, 'server-default-load-more');
		} finally {
			await evidence.closeVisitor(visitor);
		}
	});
