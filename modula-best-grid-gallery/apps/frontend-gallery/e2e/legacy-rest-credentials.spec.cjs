const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');
const fixtures = JSON.parse(
	fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_RUN_DIR,
			process.env.MODULA_E2E_MODE,
			'legacy-rest-credentials.json'
		)
	)
);
const galleries = fixtures.galleries;

async function openEditor(page) {
	await page.goto(galleries.beta.editor);
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}

async function adminRead(page, route) {
	return page.evaluate((route) => window.wp.apiFetch({ path: route }), route);
}

test('Gutenberg renders its gallery using redacted public settings', async ({
	page,
}) => {
	const configResponse = page.waitForResponse(
		(response) =>
			response.url().includes('/admin-ajax.php') &&
			(response.request().postData() || '').includes(
				'action=modula_get_jsconfig'
			)
	);
	await page.goto(fixtures.block_editor);
	const response = await configResponse;
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual(expect.any(Object));
	const submitted = new URLSearchParams(response.request().postData());
	expect(submitted.has('settings[password]')).toBe(false);
	expect(submitted.has('settings[password_protect_username]')).toBe(false);
	await expect
		.poll(async () => {
			for (const frame of page.frames()) {
				const image = frame
					.locator(`#modula-${galleries.classic.id} img.modula-image`)
					.first();
				if (
					(await image.count()) &&
					(await image.isVisible()) &&
					(await image.evaluate(
						(img) => img.complete && img.naturalWidth > 0
					))
				)
					return true;
			}
			return false;
		})
		.toBe(true);
});

function expectRedacted(settings) {
	expect(Object.hasOwn(settings, 'password')).toBe(false);
	expect(Object.hasOwn(settings, 'password_protect_username')).toBe(false);
}

test('public REST cannot disclose credentials that unlock a gallery', async ({
	page,
	evidence,
}, testInfo) => {
	await page.goto(galleries.disabled.page);
	await expect(
		page.locator(`#modula-${galleries.disabled.id}`)
	).toBeVisible();
	const observations = [];
	for (const name of ['classic', 'beta']) {
		const gallery = galleries[name];
		const visitor = await evidence.anonymous();
		try {
			const response = await visitor.request.get(
				`/wp-json/wp/v2/modula-gallery/${gallery.id}`
			);
			expect(response.status()).toBe(200);
			const settings = (await response.json()).modulaSettings;
			const passwordPresent = Object.hasOwn(settings, 'password');
			const usernamePresent = Object.hasOwn(
				settings,
				'password_protect_username'
			);
			let unlocked = false;
			if (process.env.MODULA_E2E_MODE === 'pro') {
				const page = await visitor.newPage();
				await page.goto(gallery.page);
				const password = page.locator('input[name="post_password"]');
				await expect(password).toBeVisible();
				const username = page.locator(
					'input[name="password_protect_username"]'
				);
				if (gallery.username) {
					await username.fill('wrong-owned-visitor');
					await password.fill(gallery.password);
					await page.locator('input[type="submit"]').first().click();
					await expect(password).toBeVisible();
				}
				if (gallery.username) await username.fill(gallery.username);
				await password.fill('wrong-owned-password');
				await page.locator('input[type="submit"]').first().click();
				await expect(password).toBeVisible();
				if (gallery.username)
					await username.fill(
						settings.password_protect_username ?? gallery.username
					);
				await password.fill(settings.password ?? gallery.password);
				await page.locator('input[type="submit"]').first().click();
				await expect(
					page.locator(
						`#${name === 'classic' ? 'jtg' : 'modula'}-${gallery.id}`
					)
				).toBeVisible();
				await expect(password).toHaveCount(0);
				unlocked = true;
			}
			observations.push({
				name,
				status: response.status(),
				passwordPresent,
				usernamePresent,
				unlocked,
			});
		} finally {
			await evidence.closeVisitor(visitor);
		}
	}
	await testInfo.attach('credential-presence-and-access.json', {
		body: JSON.stringify(observations),
		contentType: 'application/json',
	});
	for (const observation of observations) {
		expect(observation.passwordPresent).toBe(false);
		expect(observation.usernamePresent).toBe(false);
	}
});

test('REST representations redact by gallery edit permission and keep saved settings intact', async ({
	page,
	evidence,
}) => {
	await openEditor(page);
	const visitor = await evidence.anonymous();
	try {
		for (const name of ['classic', 'beta', 'disabled']) {
			const gallery = galleries[name];
			const route = `/wp/v2/modula-gallery/${gallery.id}`;
			// Stabilize existing editor migrations before comparing public read effects.
			const groupedBefore = await adminRead(
				page,
				`/modula/v2/gallery/${gallery.id}/settings`
			);
			const before = await adminRead(page, `${route}?context=edit`);
			expect(before.modulaSettings.password).toBe(gallery.password);
			expect(before.modulaSettings.password_protect_username).toBe(
				gallery.username
			);
			const { password, password_protect_username, ...publicSettings } =
				before.modulaSettings;
			// Pro Proofing already redacts this separate notification credential.
			if (process.env.MODULA_E2E_MODE === 'pro')
				delete publicSettings.proofing_notification_email;
			for (const headers of [{}, fixtures.author_headers]) {
				for (const context of ['', '&context=view', '&context=embed']) {
					for (const collection of [false, true]) {
						const endpoint = collection
							? `/wp/v2/modula-gallery?include=${gallery.id}`
							: `${route}?`;
						for (const fields of [
							'',
							'&_fields=id,modulaSettings',
							'&_fields=id,modulaSettings.password,modulaSettings.password_protect_username',
						]) {
							const response = await visitor.request.get(
								`/wp-json${endpoint}${context}${fields}`,
								{ headers }
							);
							expect(response.status()).toBe(200);
							const data = await response.json();
							if (collection) expect(data).toHaveLength(1);
							const item = collection ? data[0] : data;
							expectRedacted(item.modulaSettings);
							if (!fields.includes('modulaSettings.password'))
								expect(item.modulaSettings).toEqual(
									publicSettings
								);
						}
					}
				}
				const denied = await visitor.request.get(
					`/wp-json${route}?context=edit`,
					{ headers }
				);
				expect([401, 403]).toContain(denied.status());
				const write = await visitor.request.post(`/wp-json${route}`, {
					headers,
					data: { modulaSettings: { gutter: 91 } },
				});
				expect([401, 403]).toContain(write.status());
			}
			const after = await adminRead(page, `${route}?context=edit`);
			expect(after.modulaSettings).toEqual(before.modulaSettings);
			expect(after.password).toBe(before.password);
			expect(
				await adminRead(
					page,
					`/modula/v2/gallery/${gallery.id}/settings`
				)
			).toEqual(groupedBefore);
		}
		// One author, one collection: permission must be evaluated per gallery.
		const own = galleries.author;
		const response = await visitor.request.get(
			`/wp-json/wp/v2/modula-gallery?include=${own.id},${galleries.beta.id}`,
			{ headers: fixtures.author_headers }
		);
		expect(response.status()).toBe(200);
		const rows = await response.json();
		expect(rows).toHaveLength(2);
		expect(
			rows.find((row) => row.id === own.id).modulaSettings
		).toMatchObject({
			password: own.password,
			password_protect_username: own.username,
		});
		expectRedacted(
			rows.find((row) => row.id === galleries.beta.id).modulaSettings
		);
		const edit = await visitor.request.get(
			`/wp-json/wp/v2/modula-gallery/${own.id}?context=edit`,
			{ headers: fixtures.author_headers }
		);
		expect(edit.status()).toBe(200);
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('unpublished galleries, v2 password controls and sparse legacy settings remain safe', async ({
	page,
	evidence,
}) => {
	await openEditor(page);
	const visitor = await evidence.anonymous();
	try {
		for (const name of ['draft', 'private']) {
			const response = await visitor.request.get(
				`/wp-json/wp/v2/modula-gallery/${galleries[name].id}`
			);
			expect([401, 403]).toContain(response.status());
			const collection = await visitor.request.get(
				`/wp-json/wp/v2/modula-gallery?include=${galleries[name].id}`
			);
			expect(collection.status()).toBe(200);
			expect(await collection.json()).toEqual([]);
		}
		for (const query of [
			'',
			'?group=passwordProtect',
			'?groups=passwordProtect',
			'?key=passwordProtect.password',
		]) {
			const response = await visitor.request.get(
				`/wp-json/modula/v2/gallery/${galleries.beta.id}/settings${query}`
			);
			expect(response.status()).toBe(200);
			const data = await response.json();
			expect(JSON.stringify(data)).not.toContain(galleries.beta.password);
			if (query.startsWith('?key=')) expect(data.value).toBeNull();
		}
		// Pro Proofing's existing REST projection normalizes non-arrays to [].
		const expected = {
			missing: process.env.MODULA_E2E_MODE === 'pro' ? [] : '',
			empty: [],
			scalar:
				process.env.MODULA_E2E_MODE === 'pro' ? [] : 'legacy-invalid',
			'null-credentials': { gutter: 17 },
		};
		for (const [name, id] of Object.entries(fixtures.edge_cases)) {
			const response = await visitor.request.get(
				`/wp-json/wp/v2/modula-gallery/${id}?_fields=id,modulaSettings`
			);
			expect(response.status()).toBe(200);
			expect((await response.json()).modulaSettings).toEqual(
				expected[name]
			);
		}
	} finally {
		await evidence.closeVisitor(visitor);
	}
});

test('protected editor saves reopen without changing credentials', async ({
	page,
	evidence,
}) => {
	await openEditor(page);
	await page
		.getByRole('button', { name: 'Gallery layout', exact: true })
		.click();
	const saved = page.waitForResponse(
		(response) =>
			response
				.url()
				.includes(`/modula/v2/gallery/${galleries.beta.id}/settings`) &&
			(response.request().method() === 'PATCH' ||
				response.request().headers()['x-http-method-override'] ===
					'PATCH') &&
			response.ok()
	);
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.fill('23');
	await page
		.getByRole('spinbutton', { name: 'Value', exact: true })
		.press('Tab');
	await saved;
	await expect(
		page.locator('.modula-gallery-takeover__topbar-save-status')
	).toHaveText('Saved');
	await page.reload();
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
	const beta = await adminRead(
		page,
		`/wp/v2/modula-gallery/${galleries.beta.id}?context=edit`
	);
	expect(beta.modulaSettings.password).toBe(galleries.beta.password);
	expect(beta.modulaSettings.password_protect_username).toBe(
		galleries.beta.username
	);
	expect(Number(beta.modulaSettings.gutter)).toBe(23);
	if (process.env.MODULA_E2E_MODE === 'pro') {
		expect(beta.password).toBe(galleries.beta.password);
		await page.goto(galleries.classic.editor);
		await page.locator('#title').fill('Owned protected gallery saved');
		await page.locator('input[name="modula-settings[gutter]"]').fill('27');
		await Promise.all([
			page.waitForNavigation(),
			page
				.getByRole('button', { name: 'Update Gallery', exact: true })
				.click(),
		]);
		await page.goto(galleries.classic.editor);
		await expect(page.locator('#title')).toHaveValue(
			'Owned protected gallery saved'
		);
		await expect(
			page.locator('input[name="modula-settings[gutter]"]')
		).toHaveValue('27');
		await openEditor(page);
		const classic = await adminRead(
			page,
			`/wp/v2/modula-gallery/${galleries.classic.id}?context=edit`
		);
		expect(classic.modulaSettings.password).toBe(
			galleries.classic.password
		);
		expect(classic.modulaSettings.password_protect_username).toBe(
			galleries.classic.username
		);
		expect(Number(classic.modulaSettings.gutter)).toBe(27);
		expect(classic.password).toBe(galleries.classic.password);
		for (const name of ['classic', 'beta']) {
			const visitor = await evidence.anonymous();
			try {
				const publicPage = await visitor.newPage();
				await publicPage.goto(galleries[name].page);
				await expect(
					publicPage.locator('input[name="post_password"]')
				).toBeVisible();
			} finally {
				await evidence.closeVisitor(visitor);
			}
		}
	}
});
