const path = require('path');
const { defineConfig } = require('@playwright/test');

if (!process.env.MODULA_E2E_RUN_DIR) {
	throw new Error(
		'Use npm run test:wordpress-browser so site cleanup is guaranteed.'
	);
}

module.exports = defineConfig({
	testDir: __dirname,
	testMatch: '*.spec.cjs',
	workers: 1,
	fullyParallel: false,
	retries: 0,
	timeout: 90000,
	globalTimeout: 600000,
	expect: { timeout: 15000 },
	outputDir: path.join(
		process.env.MODULA_E2E_RUN_DIR,
		process.env.MODULA_E2E_MODE,
		'results'
	),
	reporter: [
		['list'],
		[
			'json',
			{
				outputFile: path.join(
					process.env.MODULA_E2E_RUN_DIR,
					process.env.MODULA_E2E_MODE,
					'report.json'
				),
			},
		],
	],
	use: {
		baseURL: 'http://localhost:10003',
		storageState: path.join(process.env.MODULA_E2E_RUN_DIR, 'auth.json'),
		browserName: 'chromium',
		actionTimeout: 15000,
		navigationTimeout: 20000,
		channel: 'chrome',
		viewport: { width: 1440, height: 1000 },
		deviceScaleFactor: 1,
		reducedMotion: 'reduce',
		trace: 'on',
		screenshot: 'only-on-failure',
	},
});
