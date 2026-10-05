const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { test: base, expect } = require('@playwright/test');

const assets = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'assets.json'))
);

async function captureResponse(response, pathname) {
	const request = response.request();
	await response.finished();
	const captured = {
		timing: request.timing(),
		sizes: await request.sizes(),
	};
	for (const plugin of ['lite', 'pro']) {
		const prefix = `/wp-content/plugins/${path.posix.dirname(assets.plugins[plugin])}/`;
		if (
			!pathname.startsWith(prefix) ||
			!/\.(js|css)$/.test(pathname) ||
			!response.ok()
		) {
			continue;
		}
		const file = pathname.slice(prefix.length);
		captured.sha256 = crypto
			.createHash('sha256')
			.update(await response.body())
			.digest('hex');
		captured.matchesBuild = captured.sha256 === assets[plugin][file];
	}
	return captured;
}

const test = base.extend({
	evidence: [
		async ({ context, browser }, use, testInfo) => {
			const records = [];
			const pending = [];
			const mismatches = [];
			const observe = (target) => {
				target.on('page', (page) => {
					page.on('console', (message) => {
						if (['error', 'warning'].includes(message.type())) {
							records.push({
								type: 'console',
								level: message.type(),
								page: page.url(),
								message: message.text(),
							});
						}
					});
					page.on('pageerror', (error) =>
						records.push({
							type: 'pageerror',
							page: page.url(),
							message: error.message,
						})
					);
				});
				target.on('requestfailed', (request) =>
					records.push({
						type: 'requestfailed',
						url: request.url(),
						error: request.failure()?.errorText,
					})
				);
				target.on('response', (response) => {
					const request = response.request();
					const pathname = decodeURIComponent(
						new URL(response.url()).pathname
					);
					const pluginAsset =
						response.ok() &&
						/\.(js|css)$/.test(pathname) &&
						Object.values(assets.plugins).some((file) =>
							pathname.startsWith(
								`/wp-content/plugins/${path.posix.dirname(file)}/`
							)
						);
					const record = {
						type: 'response',
						method: request.method(),
						url: response.url(),
						status: response.status(),
						resource: request.resourceType(),
						contentType: response.headers()['content-type'] || null,
					};
					records.push(record);
					pending.push(
						(async () => {
							let deadline;
							try {
								// A replaced iframe can leave finished() pending indefinitely.
								// Bound all capture steps without allowing late results to
								// turn an unverifiable plugin asset into a passing record.
								const captured = await Promise.race([
									captureResponse(response, pathname),
									new Promise((_, reject) => {
										deadline = setTimeout(
											() =>
												reject(
													new Error(
														'Response evidence did not settle within 15000ms'
													)
												),
											15000
										);
									}),
								]);
								Object.assign(record, captured);
								if (captured.matchesBuild === false) {
									mismatches.push(pathname);
								}
							} catch (error) {
								record.captureError = error.message;
								if (pluginAsset) {
									mismatches.push(
										`Could not verify ${pathname}: ${error.message}`
									);
								}
							} finally {
								clearTimeout(deadline);
							}
						})()
					);
				});
			};
			const flush = async () => {
				await Promise.all(pending);
				return records;
			};
			observe(context);
			await use({
				flush,
				async withBootstrapStylesheetBuild(css, check) {
					await flush();
					const file =
						'assets/css/front/modula-gallery-bootstrap.modula-gallery.css';
					const location = path.join(
						process.env.MODULA_E2E_LITE_ROOT,
						file
					);
					const original = fs.readFileSync(location);
					const originalHash = assets.lite[file];
					try {
						fs.writeFileSync(location, css);
						assets.lite[file] = crypto
							.createHash('sha256')
							.update(css)
							.digest('hex');
						await testInfo.attach('temporary-bootstrap-build', {
							body: JSON.stringify({
								file,
								originalHash,
								changedHash: assets.lite[file],
							}),
							contentType: 'application/json',
						});
						await check();
					} finally {
						await flush();
						fs.writeFileSync(location, original);
						assets.lite[file] = originalHash;
					}
				},
				async anonymous(
					viewport = { width: 1440, height: 1000 },
					options = {}
				) {
					// Explicitly override Playwright's configured editor storage state.
					const visitor = await browser.newContext({
						viewport,
						storageState: { cookies: [], origins: [] },
						deviceScaleFactor: 1,
						reducedMotion: 'reduce',
						...options,
					});
					observe(visitor);
					return visitor;
				},
				async closeVisitor(visitor) {
					await flush();
					await visitor.close();
				},
				async capture(page, name) {
					await page.screenshot({
						path: testInfo.outputPath(`${name}.png`),
						fullPage: false,
					});
				},
			});
			await flush();
			await testInfo.attach('console-network-and-assets', {
				body: JSON.stringify(records, null, 2),
				contentType: 'application/json',
			});
			expect(
				records.some((record) => record.matchesBuild),
				'At least one served plugin asset must be verified'
			).toBe(true);
			expect(
				mismatches,
				'Served plugin scripts/styles must match the recorded local builds'
			).toEqual([]);
		},
		{ auto: true },
	],
});

module.exports = { test, expect };
