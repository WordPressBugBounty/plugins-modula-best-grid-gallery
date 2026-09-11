const path = require('path');
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
	testDir: __dirname,
	testMatch: '*.spec.cjs',
	globalSetup: require.resolve('./build.cjs'),
	outputDir: path.resolve(
		__dirname,
		'../../../.scratch/listing-quick-edit-redesign/browser-results'
	),
	workers: 1,
	use: {
		browserName: 'chromium',
		channel: 'chrome',
		viewport: { width: 1440, height: 1000 },
		reducedMotion: 'reduce',
		trace: 'retain-on-failure',
	},
});
