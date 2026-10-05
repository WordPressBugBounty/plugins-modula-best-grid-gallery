const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

// The browser timezone deliberately differs from the request-scoped WordPress site timezone.
test.use({ timezoneId: 'America/Los_Angeles' });
const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

test('Quick edit preserves classic/Beta galleries while changing publication dates in site time', async ({
	page,
	context,
	evidence,
}, testInfo) => {
	await context.setExtraHTTPHeaders({
		'X-Modula-E2E-Publication-Date': catalog.run,
	});
	const listingUrl = new URL(
		'/wp-admin/edit.php?post_type=modula-gallery&page=modula-gallery-listing',
		catalog.galleries.visible.editor
	).href;
	await page.goto(listingUrl);
	await expect(page.getByRole('searchbox')).toBeVisible();
	const api = (path, data) =>
		page.evaluate(
			({ path, data }) =>
				window.wp.apiFetch({
					path,
					...(data ? { method: 'PUT', data } : {}),
				}),
			{ path, data }
		);
	const snapshot = async (id) => ({
		post: await api(`/wp/v2/modula-gallery/${id}?context=edit`),
		settings: await api(`/modula/v2/gallery/${id}/settings`),
		images: await api(`/modula/v2/gallery/${id}/images`),
	});
	const open = async (title) => {
		const search = page.getByRole('searchbox');
		if ((await search.inputValue()) !== title) {
			const refreshed = page.waitForResponse((response) => {
				const url = new URL(response.url());
				return (
					url.pathname.endsWith('/modula/v2/listing') &&
					url.searchParams.get('search') === title
				);
			});
			await search.fill(title);
			await refreshed;
		}
		const row = page.getByRole('row').filter({
			has: page.getByRole('link', { name: title, exact: true }),
		});
		await expect(row).toBeVisible();
		await row.getByRole('link', { name: title, exact: true }).focus();
		await row
			.getByRole('button', { name: 'Quick Edit', exact: true })
			.click();
		return page.getByRole('dialog', { name: 'Quick edit', exact: true });
	};
	const results = [];
	const pro = process.env.MODULA_E2E_MODE === 'pro';
	for (const [key, local, utc] of [
		[
			'classic',
			`${pro ? 1986 : 1985}-02-14T13:24:37`,
			`${pro ? 1986 : 1985}-02-14T11:24:37`,
		],
		[
			'visible',
			`${pro ? 1996 : 1995}-08-17T13:24:37`,
			`${pro ? 1996 : 1995}-08-17T10:24:37`,
		],
	]) {
		const gallery = catalog.galleries[key];
		const before = await snapshot(gallery.id);
		const title = before.post.title.raw;
		let dialog = await open(title);
		await expect(
			dialog.getByLabel('Publication date', { exact: true })
		).toHaveValue(before.post.date.replace(/:00$/, ''));
		await expect(
			dialog.getByText(/Site timezone: Europe\/Bucharest/)
		).toBeVisible();
		await dialog
			.getByLabel('Publication date', { exact: true })
			.fill(local);
		const saved = page.waitForResponse(
			(response) =>
				response
					.url()
					.includes(`/wp/v2/modula-gallery/${gallery.id}`) &&
				['POST', 'PUT'].includes(response.request().method())
		);
		await dialog
			.getByRole('button', { name: 'Save changes', exact: true })
			.click();
		expect((await saved).ok()).toBe(true);
		await expect(dialog).toHaveCount(0);
		await page.reload();
		dialog = await open(title);
		await expect(
			dialog.getByLabel('Publication date', { exact: true })
		).toHaveValue(local);
		await page.evaluate(() =>
			Promise.all(
				document
					.getAnimations()
					.filter(
						(animation) =>
							animation.effect.getComputedTiming().iterations !==
							Infinity
					)
					.map((animation) => animation.finished.catch(() => {}))
			)
		);
		await evidence.capture(page, `publication-date-${key}`);
		await dialog
			.getByRole('button', { name: 'Cancel', exact: true })
			.click();
		const after = await snapshot(gallery.id);
		expect(after.post.date).toBe(local);
		expect(after.post.date_gmt).toBe(utc);
		for (const field of [
			'id',
			'slug',
			'status',
			'title',
			'content',
			'password',
		])
			expect(after.post[field]).toEqual(before.post[field]);
		expect(after.settings).toEqual(before.settings);
		expect(after.images).toEqual(before.images);
		// Unrelated title edits omit date, retaining the exact seconds and GMT value.
		dialog = await open(title);
		await dialog
			.getByLabel('Title', { exact: true })
			.fill(`${title} renamed`);
		await dialog
			.getByRole('button', { name: 'Save changes', exact: true })
			.click();
		await expect(dialog).toHaveCount(0);
		const renamed = await api(
			`/wp/v2/modula-gallery/${gallery.id}?context=edit`
		);
		expect(renamed.date).toBe(local);
		expect(renamed.date_gmt).toBe(utc);
		await api(`/wp/v2/modula-gallery/${gallery.id}`, { title });
		results.push({
			key,
			id: gallery.id,
			date: after.post.date,
			date_gmt: after.post.date_gmt,
		});
	}
	const ordered = await api(
		'/modula/v2/listing?status=publish&orderby=date&order=asc&per_page=100&search=Modula%20E2E'
	);
	const classic = ordered.rows.findIndex(
		(row) => row.id === catalog.galleries.classic.id
	);
	const beta = ordered.rows.findIndex(
		(row) => row.id === catalog.galleries.visible.id
	);
	expect(classic).toBeGreaterThanOrEqual(0);
	expect(beta).toBeGreaterThan(classic);
	for (const result of results) {
		const row = ordered.rows.find((row) => row.id === result.id);
		expect(row.shortcode).toBe(`[modula id="${result.id}"]`);
		expect(row.date).toBe(result.date);
	}
	await page.reload();
	let dialog = await open('Modula E2E visible');
	await dialog
		.getByLabel('Publication date', { exact: true })
		.fill('2099-01-01T12:00');
	await expect(
		dialog.getByText(/WordPress schedules published galleries/)
	).toBeVisible();
	await dialog
		.getByRole('button', { name: 'Save changes', exact: true })
		.click();
	await expect(dialog).toHaveCount(0);
	await expect(
		page
			.locator('.components-notice__content')
			.getByText(/This gallery is scheduled and will not be public/)
	).toBeVisible();
	await page.getByRole('button', { name: 'Published', exact: true }).click();
	await page.getByRole('menuitemradio', { name: /Scheduled/ }).click();
	dialog = await open('Modula E2E visible');
	await expect(dialog.getByLabel('Status', { exact: true })).toHaveValue(
		'Scheduled'
	);
	await expect(
		dialog.getByLabel('Publication date', { exact: true })
	).toHaveValue('2099-01-01T12:00');
	await dialog
		.getByLabel('Publication date', { exact: true })
		.fill(results[1].date);
	await dialog
		.getByRole('button', { name: 'Save changes', exact: true })
		.click();
	await expect(dialog).toHaveCount(0);
	expect(
		(
			await api(
				`/wp/v2/modula-gallery/${catalog.galleries.visible.id}?context=edit`
			)
		).status
	).toBe('publish');
	await testInfo.attach('publication-date.json', {
		body: JSON.stringify({
			timezone: 'Europe/Bucharest',
			results,
			dateOrder: [classic, beta],
			scheduledRoundTrip: true,
		}),
		contentType: 'application/json',
	});
});
