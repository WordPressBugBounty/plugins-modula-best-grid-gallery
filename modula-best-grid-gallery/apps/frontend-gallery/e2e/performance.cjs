/* Opt-in lab measurements; run.cjs owns fixtures, activation and cleanup. */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { gzipSync } = require('zlib');
const { chromium, expect } = require('@playwright/test');

const runDir = process.env.MODULA_E2E_RUN_DIR;
const cli = process.env.MODULA_LIGHTHOUSE_CLI;
if (!runDir || !cli) {
	throw new Error(
		'Use run.cjs --performance with MODULA_LIGHTHOUSE_CLI pointing to lighthouse/cli/index.js (13.5.0).'
	);
}
const version = JSON.parse(
	fs.readFileSync(path.resolve(cli, '../../package.json'))
).version;
if (version !== '13.5.0') {
	throw new Error(`Expected Lighthouse 13.5.0, got ${version}`);
}
const catalog = JSON.parse(fs.readFileSync(path.join(runDir, 'catalog.json')));
const directory = path.join(runDir, process.env.MODULA_E2E_MODE, 'performance');
fs.mkdirSync(directory, { recursive: true });
const write = (name, data) =>
	fs.writeFileSync(path.join(directory, name), JSON.stringify(data, null, 2));
const metrics = [
	'first-contentful-paint',
	'largest-contentful-paint',
	'total-blocking-time',
	'cumulative-layout-shift',
	'speed-index',
	'total-byte-weight',
];

async function scenarios() {
	const browser = await chromium.launch({ channel: 'chrome' });
	try {
		for (const [device, viewport, dpr] of [
			['desktop', { width: 1440, height: 1000 }, 1],
			['mobile', { width: 390, height: 844 }, 2],
		]) {
			const context = await browser.newContext({
				viewport,
				deviceScaleFactor: dpr,
				storageState: { cookies: [], origins: [] },
				reducedMotion: 'reduce',
			});
			await context.tracing.start({ screenshots: true, snapshots: true });
			try {
				const page = await context.newPage();
				const errors = [];
				page.on('pageerror', (error) => errors.push(error.message));
				const response = await page.goto(catalog.pages.catalog);
				const html = await response.body();
				fs.writeFileSync(
					path.join(directory, `${device}-document.html`),
					html
				);
				const snapshots = [];
				const capture = async (phase) => {
					await page.waitForTimeout(500);
					snapshots.push({
						phase,
						...(await page.evaluate(() => ({
							elapsed: performance.now(),
							resources: performance
								.getEntriesByType('resource')
								.map(
									({
										name,
										initiatorType,
										transferSize,
										encodedBodySize,
										decodedBodySize,
										startTime,
										duration,
									}) => ({
										name,
										initiatorType,
										transferSize,
										encodedBodySize,
										decodedBodySize,
										startTime,
										duration,
									})
								),
							galleries: [
								...document.querySelectorAll('.modula-gallery'),
							].map((root) => ({
								id: root.id,
								initialized: root.classList.contains(
									'modula-gallery-initialized'
								),
							})),
							jsonBytes: [
								...document.querySelectorAll(
									'script[type="application/json"]'
								),
							]
								.filter((el) =>
									el.hasAttribute('data-modula-gallery')
								)
								.reduce(
									(sum, el) =>
										sum +
										new TextEncoder().encode(el.textContent)
											.length,
									0
								),
						}))),
					});
				};
				await expect(
					page.locator(
						`#modula-${catalog.galleries.visible.id} .modula-item`
					)
				).toHaveCount(6);
				await capture('navigation');
				await page.waitForTimeout(15000);
				await capture('idle-15-seconds');
				await page
					.getByRole('button', {
						name: 'Show gallery tab',
						exact: true,
					})
					.click();
				await expect(
					page.locator(
						`#modula-${catalog.galleries.hiddenTab.id} .modula-item`
					)
				).toHaveCount(6);
				await capture('tab-activation');
				const far = page.locator(
					`#modula-${catalog.galleries.farOffscreen.id}`
				);
				await far.scrollIntoViewIfNeeded();
				await expect(far.locator('.modula-item')).toHaveCount(6);
				await capture('scroll');
				await far.locator('.modula-item-link').first().click();
				await expect(
					page.locator('.modula-fancybox-container')
				).toBeVisible();
				await capture('first-lightbox');
				await page.keyboard.press('Escape');
				await far.locator('.modula-item-link').first().click();
				await expect(
					page.locator('.modula-fancybox-container')
				).toBeVisible();
				await capture('reused-lightbox');
				write(`${device}-scenarios.json`, {
					browser: browser.version(),
					viewport,
					dpr,
					reducedMotion: 'reduce',
					cache: 'fresh context; warm within scenario',
					throttling: 'none',
					htmlDecodedBytes: html.length,
					snapshots,
					errors,
				});
				expect(errors).toEqual([]);
			} finally {
				await context.tracing.stop({
					path: path.join(directory, `${device}-scenarios.zip`),
				});
				await context.close();
			}
		}
	} finally {
		await browser.close();
	}
}

async function main() {
	const runs = [];
	for (const device of ['mobile', 'desktop']) {
		for (let repeat = 1; repeat <= 3; repeat++) {
			const output = path.join(directory, `${device}-${repeat}`);
			console.log(
				`Lighthouse ${process.env.MODULA_E2E_MODE} ${device} ${repeat}/3`
			);
			const result = spawnSync(
				process.execPath,
				[
					cli,
					catalog.pages.catalog,
					'--only-categories=performance',
					'--output=json',
					'--output=html',
					`--output-path=${output}`,
					'--save-assets',
					'--chrome-flags=--headless',
					'--quiet',
					...(device === 'desktop' ? ['--preset=desktop'] : []),
				],
				{ stdio: 'inherit', timeout: 150000 }
			);
			if (result.status !== 0) {
				throw new Error(
					`Lighthouse failed: ${result.error || result.status}`
				);
			}
			const report = JSON.parse(fs.readFileSync(`${output}.report.json`));
			const auditErrors = Object.entries(report.audits)
				.filter(([, audit]) => audit.errorMessage)
				.map(([id, audit]) => ({ id, error: audit.errorMessage }));
			if (
				report.runtimeError ||
				auditErrors.length ||
				report.runWarnings.length
			) {
				throw new Error(
					`Incomplete Lighthouse run: ${JSON.stringify({ error: report.runtimeError, auditErrors, warnings: report.runWarnings })}`
				);
			}
			const requests = report.audits['network-requests'].details.items;
			if (
				requests.some((request) =>
					/analytics\.wpchill\.com|recorder\.js/.test(request.url)
				)
			) {
				throw new Error('Recorder found on the fixture page.');
			}
			runs.push({
				device,
				repeat,
				score: report.categories.performance.score * 100,
				...Object.fromEntries(
					metrics.map((id) => [id, report.audits[id].numericValue])
				),
				pluginTransferBytes: requests
					.filter((request) =>
						/\/wp-content\/plugins\/modula-/.test(request.url)
					)
					.reduce((sum, request) => sum + request.transferSize, 0),
				config: report.configSettings,
				browser: report.environment,
				lighthouse: report.lighthouseVersion,
			});
			write('runs.json', runs);
		}
	}
	const detector = fs.readFileSync(
		path.join(
			process.env.MODULA_E2E_LITE_ROOT,
			'assets/js/front/modula-gallery.js'
		)
	);
	write('detector.json', {
		decodedBytes: detector.length,
		gzipBytes: gzipSync(detector).length,
		gzipTargetBytes: 20 * 1024,
	});
	await scenarios();
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
