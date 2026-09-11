const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const buildPath = path.resolve(
	__dirname,
	'../../../.scratch/listing-quick-edit-redesign/browser-build'
);
const visualsPath = path.resolve(
	__dirname,
	'../../../.scratch/listing-quick-edit-redesign/visuals'
);

async function capture(page, name) {
	fs.mkdirSync(visualsPath, { recursive: true });
	await page.screenshot({
		path: path.join(visualsPath, `${name}.png`),
		animations: 'disabled',
	});
}

async function openListing(
	page,
	{
		save,
		listing,
		config = {},
		firstRow = {},
		secondRow = {},
		locale = {},
	} = {}
) {
	const rows = [
		{
			id: 101,
			type: 'gallery',
			title: 'City lights',
			status: 'publish',
			slug: 'city-lights',
			isBeta: true,
			canEdit: true,
			canDelete: true,
			layoutLabel: 'Uniform grid',
			items: { images: 4, total: 4 },
			shortcode: '[modula id="101"]',
			editUrl: '/edit/101',
			viewUrl: 'https://modula.test/gallery/city-lights/',
			updatedAt: '2026-09-09T12:00:00',
		},
		{
			id: 102,
			type: 'album',
			title: 'Summer collection',
			status: 'draft',
			slug: 'summer',
			isBeta: false,
			canEdit: true,
			canDelete: true,
			layoutLabel: 'Grid',
			items: { galleries: 2, total: 2 },
			shortcode: '[modula-album id="102"]',
			editUrl: '/edit/102',
			updatedAt: '2026-09-08T12:00:00',
		},
	];
	Object.assign(rows[0], firstRow);
	Object.assign(rows[1], secondRow);
	await page.route('https://modula.test/**', async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === '/wp-components.css') {
			return route.fulfill({
				path: path.resolve(
					__dirname,
					'../../../node_modules/@wordpress/components/build-style/style.css'
				),
				contentType: 'text/css; charset=utf-8',
			});
		}
		if (url.pathname.startsWith('/assets/')) {
			const name = path.basename(url.pathname);
			return route.fulfill({
				path: path.join(buildPath, name),
				contentType: name.endsWith('.js')
					? 'application/javascript; charset=utf-8'
					: 'text/css; charset=utf-8',
			});
		}
		if (url.pathname === '/wp-json/modula/v2/listing/view') {
			return route.fulfill({ json: {} });
		}
		if (url.pathname === '/wp-json/modula/v2/listing') {
			if (listing && (await listing(route, rows, url))) {
				return;
			}
			return route.fulfill({
				json: {
					rows,
					pagination: { total: 2, pages: 1, page: 1, perPage: 20 },
					totals: { rows: 2, items: 6 },
				},
			});
		}
		if (
			/^\/wp-json\/wp\/v2\/modula-(gallery|album)\/\d+$/.test(
				url.pathname
			)
		) {
			const changes = route.request().postDataJSON();
			if (save && (await save(route, changes))) {
				return;
			}
			const row = rows.find(
				(item) => item.id === Number(url.pathname.split('/').pop())
			);
			Object.assign(row, changes);
			return route.fulfill({
				json: {
					id: row.id,
					title: { rendered: row.title },
					slug: row.slug,
					status: row.status,
				},
			});
		}
		if (url.pathname.startsWith('/wp-json/')) {
			return route.fulfill({ json: {} });
		}
		const css = fs
			.readdirSync(buildPath)
			.filter((name) => name.endsWith('.css') && !name.includes('-rtl'));
		const bootstrap = {
			hasAlbums: true,
			isPro: true,
			canUseBulkEditor: true,
			standaloneUpsellUrl: 'https://modula.test/upgrade',
			extensionEntitlements: {
				'modula-standalone': { available: true, enabled: true },
			},
			...config,
		};
		return route.fulfill({
			contentType: 'text/html',
			body: `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/wp-components.css">${css.map((name) => `<link rel="stylesheet" href="/assets/${name}">`).join('')}<style>body{margin:0;background:#f0f0f1;font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}</style></head><body><div id="modula-gallery-listing-root"></div><script>window.modulaListingTestLocale=${JSON.stringify(locale)};window.modulaGalleryListing=${JSON.stringify(bootstrap)};</script><script src="/assets/listing.js"></script></body></html>`,
		});
	});
	await page.goto('https://modula.test/');
	await expect(page.getByRole('row')).toHaveCount(3);
	return rows;
}

test('row shortcuts reveal without moving the row or its neighbors', async ({
	page,
}) => {
	await openListing(page);
	const row = page.getByRole('row').filter({
		has: page.getByRole('link', { name: 'City lights', exact: true }),
	});
	const nextRow = page.getByRole('row').filter({
		has: page.getByRole('link', {
			name: 'Summer collection',
			exact: true,
		}),
	});
	await page.mouse.move(0, 0);
	const before = await row.boundingBox();
	const nextBefore = await nextRow.boundingBox();
	await capture(page, 'listing-idle');
	await row.hover();
	await expect(
		row.getByRole('button', { name: 'Quick Edit', exact: true })
	).toBeVisible();
	expect(await row.boundingBox()).toEqual(before);
	expect(await nextRow.boundingBox()).toEqual(nextBefore);
	await capture(page, 'listing-hover');
});

for (const title of ['City lights', 'Summer collection']) {
	test(`saves title, status and slug for ${title} through the listing REST boundary`, async ({
		page,
	}) => {
		await openListing(page);
		const row = page.getByRole('row').filter({
			has: page.getByRole('link', { name: title, exact: true }),
		});
		await row.hover();
		await row
			.getByRole('button', { name: 'Quick Edit', exact: true })
			.click();
		const dialog = page.getByRole('dialog', {
			name: 'Quick edit',
			exact: true,
		});
		await dialog
			.getByRole('textbox', { name: 'Title', exact: true })
			.fill(`${title} revised`);
		await dialog
			.getByRole('combobox', { name: 'Status', exact: true })
			.selectOption('private');
		await dialog
			.getByRole('textbox', { name: 'URL slug', exact: true })
			.fill('revised-slug');
		await dialog.getByRole('button', { name: 'Save changes' }).click();
		await expect(dialog).toHaveCount(0);
		const updatedRow = page.getByRole('row').filter({
			has: page.getByRole('link', {
				name: `${title} revised`,
				exact: true,
			}),
		});
		await expect(
			updatedRow.getByText('Private', { exact: true })
		).toBeVisible();
		await updatedRow.hover();
		await updatedRow
			.getByRole('button', { name: 'Quick Edit', exact: true })
			.click();
		await expect(
			dialog.getByRole('textbox', { name: 'URL slug', exact: true })
		).toHaveValue('revised-slug');
	});
}

test('save errors preserve the draft, retry works, and pending saves cannot be dismissed or duplicated', async ({
	page,
}) => {
	let writes = 0;
	let releaseSave;
	const pending = new Promise((resolve) => {
		releaseSave = resolve;
	});
	await openListing(page, {
		save: async (route) => {
			writes++;
			if (writes === 1) {
				await route.fulfill({
					status: 500,
					json: {
						message: 'The server could not save this gallery.',
					},
				});
				return true;
			}
			await pending;
			return false;
		},
	});
	await page.getByRole('link', { name: 'City lights', exact: true }).focus();
	await page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first()
		.click();
	const dialog = page.getByRole('dialog', {
		name: 'Quick edit',
		exact: true,
	});
	await dialog
		.getByRole('textbox', { name: 'Title', exact: true })
		.fill('Retry this title');
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog.getByRole('alert')).toHaveText(
		'The server could not save this gallery.'
	);
	await capture(page, 'modal-error');
	await expect(
		dialog.getByRole('textbox', { name: 'Title', exact: true })
	).toHaveValue('Retry this title');
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(
		dialog.getByRole('button', { name: 'Saving…' })
	).toBeDisabled();
	await expect(
		dialog.getByRole('button', { name: 'Close', exact: true })
	).toBeDisabled();
	await expect(
		dialog.getByRole('button', { name: 'Cancel', exact: true })
	).toBeDisabled();
	await page.keyboard.press('Escape');
	await page.keyboard.press('Enter');
	await page.mouse.click(5, 5);
	await expect(dialog).toBeVisible();
	expect(writes).toBe(2);
	releaseSave();
	await expect(dialog).toHaveCount(0);
	await expect(
		page.getByRole('link', { name: 'Retry this title', exact: true })
	).toBeVisible();
});

test('Quick edit opens a focused modal and leaves the listing row intact', async ({
	page,
}) => {
	await openListing(page);
	const row = page.getByRole('row').filter({
		has: page.getByRole('link', { name: 'City lights', exact: true }),
	});
	await row.hover();
	const before = await row.boundingBox();
	const trigger = row.getByRole('button', {
		name: 'Quick Edit',
		exact: true,
	});
	await trigger.click();
	const dialog = page.getByRole('dialog', {
		name: 'Quick edit',
		exact: true,
	});
	await expect(dialog).toBeVisible();
	await expect(
		dialog.getByRole('textbox', { name: 'Title', exact: true })
	).toBeFocused();
	await expect(
		dialog.getByRole('button', { name: 'Save changes' })
	).toBeDisabled();
	await capture(page, 'modal-desktop');
	// Use the physical table here: the accessible tree correctly hides it during editing.
	expect(await page.locator('tbody tr').first().boundingBox()).toEqual(
		before
	);
	await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(trigger).toBeFocused();
});

test('dirty dismissal retains edits until the user explicitly discards them', async ({
	page,
}) => {
	await openListing(page);
	await page.getByRole('link', { name: 'City lights', exact: true }).focus();
	await page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first()
		.click();
	const dialog = page.getByRole('dialog', {
		name: 'Quick edit',
		exact: true,
	});
	await dialog
		.getByRole('textbox', { name: 'Title', exact: true })
		.fill('New city title');
	await page.keyboard.press('Escape');
	await expect(
		dialog.getByRole('button', { name: 'Keep editing', exact: true })
	).toBeFocused();
	await capture(page, 'modal-discard');
	await page.keyboard.press('Escape');
	await expect(
		dialog.getByRole('textbox', { name: 'Title', exact: true })
	).toHaveValue('New city title');
	await expect(
		dialog.getByRole('textbox', { name: 'Title', exact: true })
	).toBeFocused();
	await dialog.getByRole('button', { name: 'Close', exact: true }).click();
	await dialog
		.getByRole('button', { name: 'Keep editing', exact: true })
		.click();
	await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
	await dialog
		.getByRole('button', { name: 'Discard changes', exact: true })
		.click();
	await expect(dialog).toHaveCount(0);
	await expect(
		page.getByRole('link', { name: 'City lights', exact: true })
	).toBeVisible();
});

test('background refresh preserves dirty fields and modal focus stays contained', async ({
	page,
	context,
}) => {
	const rows = await openListing(page);
	await page.getByRole('link', { name: 'City lights', exact: true }).focus();
	await page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first()
		.click();
	const dialog = page.getByRole('dialog', {
		name: 'Quick edit',
		exact: true,
	});
	await dialog
		.getByRole('textbox', { name: 'Title', exact: true })
		.fill('My unsaved title');
	rows[0].title = 'Background update';
	await context.setOffline(true);
	await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
	const refresh = page.waitForResponse((response) =>
		response.url().includes('/wp-json/modula/v2/listing?')
	);
	await context.setOffline(false);
	await refresh;
	await expect(
		dialog.getByRole('textbox', { name: 'Title', exact: true })
	).toHaveValue('My unsaved title');
	await expect(
		dialog.getByText('City lights', { exact: true })
	).toBeVisible();
	for (let step = 0; step < 10; step++) {
		await page.keyboard.press('Tab');
		expect(
			await dialog.evaluate((element) =>
				element.contains(document.activeElement)
			)
		).toBe(true);
	}
	await page.mouse.click(5, 5);
	await expect(dialog).toBeVisible();
	await expect(page.getByRole('searchbox')).toHaveCount(0);
});

test('View saved page keeps saved public state and Standalone access policy', async ({
	page,
}) => {
	await openListing(page, {
		config: { isPro: false, extensionEntitlements: {} },
	});
	await page.getByRole('link', { name: 'City lights', exact: true }).focus();
	await page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first()
		.click();
	const dialog = page.getByRole('dialog', {
		name: 'Quick edit',
		exact: true,
	});
	const savedPage = dialog.getByRole('link', { name: /View saved page/ });
	await expect(savedPage).toHaveAttribute(
		'href',
		'https://modula.test/upgrade'
	);
	await expect(savedPage).toContainText('Pro');
	await dialog
		.getByRole('textbox', { name: 'URL slug', exact: true })
		.fill('not-saved');
	await dialog
		.getByRole('combobox', { name: 'Status', exact: true })
		.selectOption('draft');
	await expect(savedPage).toHaveAttribute(
		'href',
		'https://modula.test/upgrade'
	);
	await expect(
		dialog.getByText('Saved URL:', { exact: false })
	).toContainText('/gallery/city-lights/');
});

test('touch shortcuts and narrow modal remain usable with a short viewport', async ({
	browser,
}) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		hasTouch: true,
		reducedMotion: 'reduce',
	});
	const page = await context.newPage();
	await openListing(page);
	const trigger = page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first();
	await expect(trigger).toBeVisible();
	expect((await trigger.boundingBox()).height).toBeGreaterThanOrEqual(44);
	await trigger.tap();
	const dialog = page.getByRole('dialog', {
		name: 'Quick edit',
		exact: true,
	});
	await expect(dialog).toBeVisible();
	const input = dialog.getByRole('textbox', { name: 'Title', exact: true });
	await input.fill(
		'A long translated gallery title that should fit without making the modal overflow'
	);
	await capture(page, 'modal-touch');
	expect((await dialog.boundingBox()).width).toBeLessThanOrEqual(358);
	expect(
		await dialog.evaluate(
			(element) => element.scrollWidth <= element.clientWidth
		)
	).toBe(true);
	await page.setViewportSize({ width: 390, height: 420 });
	await capture(page, 'modal-short-viewport');
	await expect(
		dialog.getByRole('button', { name: 'Save changes' })
	).toBeInViewport();
	await expect(
		dialog.getByRole('button', { name: 'Close', exact: true })
	).toBeInViewport();
	await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
	await expect(
		dialog.getByRole('button', { name: 'Keep editing' })
	).toBeInViewport();
	await capture(page, 'modal-touch-discard');
	await dialog.getByRole('button', { name: 'Keep editing' }).click();
	await page.route('**/wp-json/wp/v2/modula-gallery/101*', (route) =>
		route.fulfill({
			status: 500,
			contentType: 'application/json',
			body: JSON.stringify({
				message: 'The server could not save this gallery.',
			}),
		})
	);
	await dialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(dialog.getByRole('alert')).toContainText(
		'The server could not save this gallery.'
	);
	await dialog.getByRole('alert').scrollIntoViewIfNeeded();
	await capture(page, 'modal-touch-error');
	await expect(
		dialog.getByRole('button', { name: 'Save changes' })
	).toBeInViewport();
	await context.close();
});

test('saved identity and Title preserve literal entity text consistently', async ({
	page,
}) => {
	await openListing(page, { firstRow: { title: 'Rock &amp;amp; Roll' } });
	await page
		.getByRole('link', { name: 'Rock &amp; Roll', exact: true })
		.focus();
	await page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first()
		.click();
	const dialog = page.getByRole('dialog', {
		name: 'Quick edit',
		exact: true,
	});
	await expect(
		dialog.getByRole('textbox', { name: 'Title', exact: true })
	).toHaveValue('Rock &amp; Roll');
	await expect(
		dialog.getByText('Rock &amp; Roll', { exact: true })
	).toBeVisible();
});

test('long translated shortcuts wrap without hover shifts', async ({
	page,
}) => {
	await page.setViewportSize({ width: 800, height: 900 });
	await openListing(page, {
		locale: {
			'': { domain: 'modula-best-grid-gallery', lang: 'de' },
			Edit: ['Galerie bearbeiten'],
			'Quick Edit': ['Schnellbearbeitung öffnen'],
			'Bulk Editor': ['Bildinformationen bearbeiten'],
			Trash: ['In Papierkorb verschieben'],
		},
	});
	const row = page.getByRole('row').filter({
		has: page.getByRole('link', { name: 'City lights', exact: true }),
	});
	await page.mouse.move(0, 0);
	const before = await row.boundingBox();
	await row.hover();
	await expect(
		row.getByRole('button', {
			name: 'Schnellbearbeitung öffnen',
			exact: true,
		})
	).toBeVisible();
	expect(await row.boundingBox()).toEqual(before);
	await capture(page, 'listing-translated');
});

for (const name of ['City lights', 'Summer collection']) {
	test(`03: filtered saved ${name} is removed with useful focus`, async ({
		page,
	}) => {
		await openListing(page, {
			secondRow: { status: 'publish' },
			listing: async (route, rows, url) => {
				const visible = rows.filter(
					(row) =>
						!url.searchParams.get('status') ||
						row.status === url.searchParams.get('status')
				);
				await route.fulfill({
					json: {
						rows: visible,
						pagination: {
							total: visible.length,
							pages: 1,
							page: 1,
							perPage: 20,
						},
						totals: { rows: visible.length, items: 6 },
					},
				});
				return true;
			},
		});
		await page
			.getByRole('button', { name: 'All statuses', exact: true })
			.click();
		await page
			.getByRole('menuitemradio', { name: 'Published', exact: true })
			.click();
		const row = page
			.getByRole('row')
			.filter({ has: page.getByRole('link', { name, exact: true }) });
		await row.hover();
		await row
			.getByRole('button', { name: 'Quick Edit', exact: true })
			.click();
		await page
			.getByRole('combobox', { name: 'Status', exact: true })
			.selectOption('draft');
		await page.getByRole('button', { name: 'Save changes' }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(page.getByRole('link', { name, exact: true })).toHaveCount(
			0
		);
		await expect(
			page
				.locator('.components-notice__content')
				.getByText(
					'Changes saved. This item no longer matches the status filter.',
					{ exact: true }
				)
		).toBeVisible();
		await expect(page.getByRole('searchbox')).toBeFocused();
	});
}

test('03: unsupported status is preserved and canonical server values determine sorted rows and saved URL', async ({
	page,
}) => {
	let writes = 0;
	await openListing(page, {
		firstRow: { status: 'pending' },
		save: async (route, changes) => {
			expect(changes).not.toHaveProperty('status');
			writes++;
			changes.title = 'Canonical title';
			changes.slug = 'canonical-slug';
			changes.viewUrl = 'https://modula.test/gallery/canonical-slug/';
			return false;
		},
		listing: async (route, rows) => {
			if (!writes) return false;
			await route.fulfill({
				json: {
					rows: [...rows].reverse(),
					pagination: { total: 2, pages: 1, page: 1, perPage: 20 },
					totals: { rows: 2, items: 6 },
				},
			});
			return true;
		},
	});
	await page.getByRole('link', { name: 'City lights', exact: true }).focus();
	await page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first()
		.click();
	await expect(
		page.getByRole('textbox', { name: 'Status', exact: true })
	).toHaveValue('pending');
	await expect(
		page.getByRole('textbox', { name: 'Status', exact: true })
	).toHaveAttribute('readonly', '');
	await page
		.getByRole('textbox', { name: 'Title', exact: true })
		.fill('Draft input');
	await page.getByRole('button', { name: 'Save changes' }).click();
	const row = page.getByRole('row').filter({
		has: page.getByRole('link', {
			name: 'Canonical title',
			exact: true,
		}),
	});
	await expect(
		row.getByRole('button', { name: 'Quick Edit', exact: true })
	).toBeFocused();
	await expect(page.getByRole('row').last()).toContainText('Canonical title');
	await row.getByRole('button', { name: 'Quick Edit', exact: true }).click();
	await expect(
		page.getByRole('textbox', { name: 'URL slug', exact: true })
	).toHaveValue('canonical-slug');
	await expect(
		page.getByText('Saved URL:', { exact: false })
	).toContainText('/gallery/canonical-slug/');
	await expect(
		page.getByRole('link', { name: /View saved page/ })
	).toHaveCount(0);
});

test('03: refresh failure retries only the read and page movement is not blamed on filters', async ({
	page,
}) => {
	let writes = 0;
	let failRefresh = true;
	await openListing(page, {
		save: async () => {
			writes++;
			return false;
		},
		listing: async (route, rows) => {
			if (!writes) return false;
			await route.fulfill(
				failRefresh
					? { status: 500, json: { message: 'Refresh unavailable' } }
					: {
							json: {
								rows: rows.slice(1),
								pagination: {
									total: 2,
									pages: 2,
									page: 1,
									perPage: 1,
								},
								totals: { rows: 2, items: 6 },
							},
						}
			);
			return true;
		},
	});
	await page.getByRole('link', { name: 'City lights', exact: true }).focus();
	await page
		.getByRole('button', { name: 'Quick Edit', exact: true })
		.first()
		.click();
	await page
		.getByRole('textbox', { name: 'Title', exact: true })
		.fill('Moved title');
	await page.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(
		page
			.locator('.components-notice__content')
			.getByText(
				'Changes saved, but the listing could not be refreshed. Refresh the listing to see the saved values.',
				{ exact: true }
			)
	).toBeVisible();
	failRefresh = false;
	await page
		.getByRole('button', { name: 'Refresh listing', exact: true })
		.click();
	await expect(
		page
			.locator('.components-notice__content')
			.getByText(
				'Changes saved. This item is not visible in the current listing view.',
				{ exact: true }
			)
	).toBeVisible();
	await expect(page.getByRole('searchbox')).toBeFocused();
	expect(writes).toBe(1);
});
