#!/usr/bin/env node
'use strict';

// Explicit standalone component probe, not an alternate WordPress installation.
// node abilities-compatibility.cjs --php /path/to/php --core /path/to/wordpress
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const args = process.argv.slice(2);
const php = args[args.indexOf('--php') + 1];
const core = args[args.indexOf('--core') + 1];
if (!args.includes('--php') || !args.includes('--core') || !php || !core) {
	throw new Error(
		'Supply --php and --core pointing to official WordPress 6.9 source.'
	);
}
const files = [
	'wp-includes/version.php',
	'wp-includes/compat.php',
	'wp-includes/utf8.php',
	'wp-includes/load.php',
	'wp-includes/plugin.php',
	'wp-includes/class-wp-hook.php',
	'wp-includes/functions.php',
	'wp-includes/option.php',
	'wp-includes/formatting.php',
	'wp-includes/shortcodes.php',
	'wp-includes/class-wp-error.php',
	'wp-includes/rest-api.php',
	'wp-includes/abilities-api.php',
	'wp-includes/abilities-api/class-wp-ability.php',
	'wp-includes/abilities-api/class-wp-abilities-registry.php',
	'wp-includes/abilities-api/class-wp-ability-category.php',
	'wp-includes/abilities-api/class-wp-ability-categories-registry.php',
];
const sha256 = Object.fromEntries(
	files.map((file) => [
		file,
		crypto
			.createHash('sha256')
			.update(fs.readFileSync(path.join(core, file)))
			.digest('hex'),
	])
);
const repo = path.resolve(__dirname, '../../..');
const pluginSha256 = Object.fromEntries(
	[
		'includes/v2/bootstrap.php',
		'includes/v2/class-loader.php',
		'includes/v2/autoload.php',
		'includes/v2/abilities/class-integration.php',
		'includes/v2/abilities/class-contract.php',
	].map((file) => [
		file,
		crypto
			.createHash('sha256')
			.update(fs.readFileSync(path.join(repo, file)))
			.digest('hex'),
	])
);
const probes = ['absent', 'native'].map((mode) =>
	JSON.parse(
		execFileSync(
			php,
			[
				'-d',
				'display_errors=stderr',
				path.join(__dirname, 'abilities-compatibility.php'),
				core,
				mode,
			],
			{
				encoding: 'utf8',
				timeout: 30000,
				stdio: ['ignore', 'pipe', 'pipe'],
			}
		)
	)
);
process.stdout.write(
	JSON.stringify(
		{
			core_source: 'https://wordpress.org/wordpress-6.9.tar.gz',
			core_directory: path.resolve(core),
			source_sha256: sha256,
			plugin_sha256: pluginSha256,
			probes,
		},
		null,
		2
	) + '\n'
);
