/* Run against the user-designated Local dev site; never reset its database. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawn } = require('child_process');
const { chromium } = require('@playwright/test');

const liteRoot = path.resolve(__dirname, '../../..');
const proRoot = path.resolve(liteRoot, '../modula-pro');
const artifacts = path.join(liteRoot, '.scratch/wordpress-e2e');
const localRoot = path.join(os.homedir(), 'Library/Application Support/Local');
const sites = Object.values(
	JSON.parse(fs.readFileSync(path.join(localRoot, 'sites.json')))
);
const site = sites.find((entry) => entry.name === 'dev');
if (!site || site.services.nginx.ports.HTTP[0] !== 10003) {
	throw new Error('Expected the existing Local site dev on port 10003.');
}
const phpService = fs
	.readdirSync(path.join(localRoot, 'lightning-services'))
	.find((name) => name.startsWith(`php-${site.services.php.version}+`));
const php = path.join(
	localRoot,
	'lightning-services',
	phpService,
	'bin',
	`darwin-${os.arch()}`,
	'bin/php'
);
const wpCli =
	'/Applications/Local.app/Contents/Resources/extraResources/bin/wp-cli/wp-cli.phar';
const wpPath = path.join(site.path.replace(/^~/, os.homedir()), 'app/public');
const recovery = process.argv[2] === '--cleanup' ? process.argv[3] : null;
const specIndex = process.argv.indexOf('--spec');
const nativeOnly = process.argv.includes('--abilities-native-only');
const proCompatibilityOnly = process.argv.includes(
	'--abilities-pro-compatibility-only'
);
const foldersOnly = process.argv.includes('--abilities-folders-only');
const selectedSpec = specIndex < 0 ? null : process.argv[specIndex + 1];
if (
	specIndex >= 0 &&
	(!selectedSpec ||
		!/^[a-z-]+\.spec\.cjs$/.test(selectedSpec) ||
		!fs.existsSync(path.join(__dirname, selectedSpec)))
) {
	throw new Error(
		'--spec requires an existing spec filename from this directory.'
	);
}
if (process.argv[2] === '--cleanup' && !recovery) {
	throw new Error(
		'--cleanup requires the identifier of the interrupted run.'
	);
}
const run = recovery || `modula-e2e-${crypto.randomBytes(8).toString('hex')}`;
if (!/^modula-e2e-[a-f0-9]{16}$/.test(run)) {
	throw new Error('Invalid run identifier.');
}
const runDir = path.join(artifacts, run);
fs.mkdirSync(runDir, { recursive: true, mode: 0o700 });
const env = {
	...process.env,
	MAGICK_CODER_MODULE_PATH: path.join(
		path.dirname(path.dirname(php)),
		'ImageMagick/modules-Q16/coders'
	),
	MODULA_E2E_CLOUD_IMAGE_ONLY:
		selectedSpec === 'abilities-cloud-image.spec.cjs' ? '1' : '',
	MODULA_E2E_RUN: run,
	MODULA_E2E_AI_RETIREMENT:
		selectedSpec === 'abilities-ai-retirement.spec.cjs' ? '1' : '',
	MODULA_E2E_RUN_DIR: runDir,
	MODULA_E2E_LITE_ROOT: liteRoot,
	MODULA_E2E_PRO_ROOT: proRoot,
	MODULA_E2E_PASSWORD: crypto.randomBytes(32).toString('hex'),
};
function write(name, data) {
	fs.writeFileSync(path.join(runDir, name), JSON.stringify(data, null, 2), {
		mode: 0o600,
	});
}
function wordpress(action, extra = {}, cliArgs = []) {
	const output = execFileSync(
		php,
		[
			'-c',
			path.join(localRoot, 'run', site.id, 'conf/php/php.ini'),
			wpCli,
			`--path=${wpPath}`,
			...cliArgs,
			'eval-file',
			path.join(__dirname, 'wordpress.php'),
		],
		{
			env: { ...env, ...extra, MODULA_E2E_ACTION: action },
			encoding: 'utf8',
			maxBuffer: 16 * 1024 * 1024,
			timeout: 60000,
		}
	);
	const result = output
		.split('\n')
		.find((line) => line.startsWith('MODULA_E2E_JSON:'));
	if (!result) {
		throw new Error(`No fixture result for ${action}: ${output}`);
	}
	return JSON.parse(result.slice('MODULA_E2E_JSON:'.length));
}
function revision(root) {
	return {
		commit: execFileSync('git', ['rev-parse', 'HEAD'], {
			cwd: root,
			encoding: 'utf8',
		}).trim(),
		status: execFileSync('git', ['status', '--short'], {
			cwd: root,
			encoding: 'utf8',
		}),
		diffSha256: crypto
			.createHash('sha256')
			.update(
				execFileSync('git', ['diff', 'HEAD'], {
					cwd: root,
					// Tracked editor bundles can exceed Node's default 1 MiB buffer.
					maxBuffer: 64 * 1024 * 1024,
				})
			)
			.digest('hex'),
	};
}
function hashAssets(root, directory, output = {}) {
	const full = path.join(root, directory);
	if (!fs.existsSync(full)) {
		return output;
	}
	for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
		const relative = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			hashAssets(root, relative, output);
		} else if (/\.(js|css)$/.test(entry.name)) {
			output[relative] = crypto
				.createHash('sha256')
				.update(fs.readFileSync(path.join(root, relative)))
				.digest('hex');
		}
	}
	return output;
}

const debugFile = path.join(wpPath, 'wp-content/debug.log');
const debugBefore = fs.existsSync(debugFile) ? fs.statSync(debugFile).size : 0;
function debugEvidence() {
	const after = fs.existsSync(debugFile) ? fs.statSync(debugFile).size : 0;
	const delta = fs.existsSync(debugFile)
		? fs
				.readFileSync(debugFile)
				.subarray(after >= debugBefore ? debugBefore : 0)
				.toString()
		: '';
	const evidence = {
		beforeBytes: debugBefore,
		afterBytes: after,
		truncatedExternally: after < debugBefore,
		addedBytes: Buffer.byteLength(delta),
		databaseErrors: (delta.match(/WordPress database error/g) || []).length,
		warnings: (delta.match(/PHP Warning:/g) || []).length,
		fatals: (delta.match(/PHP Fatal error:/g) || []).length,
		notices: (delta.match(/PHP Notice:/g) || []).length,
		deprecated: (delta.match(/PHP Deprecated:/g) || []).length,
	};
	write('debug-log.json', evidence);
	return evidence;
}

let child;
let interrupted = false;
let ownsLock = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => {
		interrupted = true;
		if (child) {
			process.kill(-child.pid, 'SIGTERM');
		}
	});
}
async function command(bin, args, cwd, log, extraEnv = {}) {
	if (interrupted) {
		throw new Error('Interrupted; restoring the dev site.');
	}
	const fd = log ? fs.openSync(path.join(runDir, log), 'w', 0o600) : null;
	try {
		const code = await new Promise((resolve, reject) => {
			child = spawn(bin, args, {
				cwd,
				detached: true,
				env: { ...env, ...extraEnv },
				stdio: fd === null ? 'inherit' : ['ignore', fd, fd],
			});
			child.once('error', reject);
			child.once('exit', (status) => resolve(status ?? 1));
		});
		if (code !== 0 || interrupted) {
			throw new Error(
				`${bin} ${args.join(' ')} failed (${code}); see ${log || runDir}`
			);
		}
	} finally {
		child = null;
		if (fd !== null) {
			fs.closeSync(fd);
		}
	}
}

async function cleanupProofingMail() {
	if (fs.existsSync(path.join(runDir, 'proofing-mail-enabled.json'))) {
		write(
			'proofing-mail-cleanup.json',
			await require('./proofing-mail.cjs')(run, true)
		);
	}
}

async function main() {
	console.log(`WordPress E2E artifacts: ${runDir}`);
	if (recovery) {
		write('cleanup.json', wordpress('cleanup'));
		try {
			await cleanupProofingMail();
		} finally {
			debugEvidence();
			fs.rmSync(path.join(runDir, 'auth.json'), { force: true });
		}
		return;
	}
	const response = await fetch('http://localhost:10003/wp-login.php', {
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok) {
		throw new Error('The designated dev site is unavailable.');
	}
	const original = wordpress('begin');
	ownsLock = true;
	try {
		write('environment.json', {
			...original,
			site: 'http://localhost:10003',
			startedAt: new Date().toISOString(),
			node: process.version,
			playwright: require('@playwright/test/package.json').version,
			measurementBuild:
				process.env.MODULA_PERFORMANCE_BUILD || 'working-tree',
			fixtureSha256: crypto
				.createHash('sha256')
				.update(fs.readFileSync(path.join(__dirname, 'wordpress.php')))
				.digest('hex'),
			lite: revision(liteRoot),
			pro: revision(proRoot),
		});
		if (
			!nativeOnly &&
			!foldersOnly &&
			!proCompatibilityOnly &&
			!process.argv.includes('--skip-build')
		) {
			for (const script of ['build', 'min:js', 'min:css']) {
				await command(
					'npm',
					['run', script],
					liteRoot,
					`${script.replace(':', '-')}.log`
				);
			}
			await command('npm', ['run', 'build'], proRoot, 'pro-build.log');
		}
		write('assets.json', {
			buildsReused:
				nativeOnly ||
				foldersOnly ||
				proCompatibilityOnly ||
				process.argv.includes('--skip-build'),
			plugins: original.plugins,
			lite: {
				...hashAssets(liteRoot, 'assets'),
				...hashAssets(liteRoot, 'includes'),
				...hashAssets(liteRoot, 'wpchill-folders/build'),
			},
			pro: {
				...hashAssets(proRoot, 'assets'),
				...hashAssets(
					proRoot,
					'includes/public/settings-editor-pro-core'
				),
				...hashAssets(proRoot, 'includes/extensions'),
			},
		});
		if (
			!foldersOnly &&
			!proCompatibilityOnly &&
			(!selectedSpec || selectedSpec === 'abilities-media.spec.cjs')
		) {
			write('media-trash-fixture.json', wordpress('media-trash-prepare'));
		}
		const catalog = wordpress('seed');
		write('catalog.json', catalog);
		if (proCompatibilityOnly) {
			await require('./abilities-pro-compatibility.cjs')({
				wordpress,
				write,
				env,
				runDir,
				proRoot,
			});
			return;
		}
		if (foldersOnly) {
			await require('./abilities-folders.cjs')({
				wordpress,
				write,
				env,
				runDir,
			});
			return;
		}
		if (!nativeOnly) {
			const browser = await chromium.launch({ channel: 'chrome' });
			try {
				write('browser.json', { version: browser.version() });
				// Authenticate before tracing: neither login POST nor password enters traces.
				const context = await browser.newContext();
				const page = await context.newPage();
				await page.goto('http://localhost:10003/wp-login.php');
				await page.getByLabel('Username or Email Address').fill(run);
				await page
					.getByLabel('Password', { exact: true })
					.fill(env.MODULA_E2E_PASSWORD);
				await Promise.all([
					page.waitForURL('**/wp-admin/**'),
					page
						.getByRole('button', { name: 'Log In', exact: true })
						.click(),
				]);
				write('auth.json', await context.storageState());
			} finally {
				await browser.close();
			}
		}
		const operationsPassword = env.MODULA_E2E_PASSWORD;
		delete env.MODULA_E2E_PASSWORD;
		for (const mode of ['lite', 'pro']) {
			fs.mkdirSync(path.join(runDir, mode), { recursive: true });
			try {
				write(
					`${mode}/activation.json`,
					wordpress('mode', { MODULA_E2E_MODE: mode })
				);
				if (
					!selectedSpec ||
					selectedSpec === 'gallery-business-operations.spec.cjs'
				) {
					write(
						`${mode}/gallery-business-operations.json`,
						wordpress('gallery-business-operations', {
							MODULA_E2E_MODE: mode,
						})
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'legacy-rest-credentials.spec.cjs'
				) {
					write(
						`${mode}/legacy-rest-credentials.json`,
						wordpress('legacy-rest-credentials', {
							MODULA_E2E_MODE: mode,
						})
					);
				}
				if (
					!selectedSpec ||
					[
						'abilities-discovery.spec.cjs',
						'abilities-creation.spec.cjs',
						'abilities-settings.spec.cjs',
						'abilities-composition.spec.cjs',
						'abilities-embedded.spec.cjs',
						'abilities-lifecycle.spec.cjs',
						'abilities-batch.spec.cjs',
						'abilities-albums.spec.cjs',
						'abilities-presets.spec.cjs',
						'abilities-media.spec.cjs',
						'abilities-administration.spec.cjs',
						'abilities-storage.spec.cjs',
						'abilities-cloud-image.spec.cjs',
						'abilities-cloud-jobs.spec.cjs',
						'abilities-watermark-video.spec.cjs',
						'vimeo-showcase.spec.cjs',
						'abilities-instagram-ai.spec.cjs',
						'abilities-ai-retirement.spec.cjs',
						'abilities-css-ai.spec.cjs',
						'abilities-proofing.spec.cjs',
					].includes(selectedSpec)
				) {
					wordpress('abilities-transport-prepare', {
						MODULA_E2E_MODE: mode,
					});
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-discovery.spec.cjs'
				) {
					write(
						`${mode}/abilities-discovery.json`,
						wordpress('abilities-discovery', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-native-without-mcp.json`,
						wordpress(
							'abilities-native-without-mcp',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-creation.spec.cjs'
				) {
					write(
						`${mode}/abilities-creation-prepare.json`,
						wordpress('abilities-creation-prepare', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-creation-crash.json`,
						wordpress('abilities-creation-crash', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-creation.json`,
						wordpress('abilities-creation', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-creation-native-only.json`,
						wordpress(
							'abilities-creation-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-settings.spec.cjs'
				) {
					write(
						`${mode}/abilities-settings.json`,
						wordpress('abilities-settings', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-settings-native-only.json`,
						wordpress(
							'abilities-settings-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-composition.spec.cjs'
				) {
					write(
						`${mode}/abilities-composition.json`,
						wordpress('abilities-composition', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-composition-native-only.json`,
						wordpress(
							'abilities-composition-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-embedded.spec.cjs'
				) {
					write(
						`${mode}/abilities-embedded.json`,
						wordpress('abilities-embedded', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-embedded-native-only.json`,
						wordpress(
							'abilities-embedded-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-lifecycle.spec.cjs'
				) {
					write(
						`${mode}/abilities-lifecycle.json`,
						wordpress('abilities-lifecycle', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-lifecycle-native-only.json`,
						wordpress(
							'abilities-lifecycle-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-proofing.spec.cjs'
				) {
					write('proofing-mail-enabled.json', { run });
					write(
						`${mode}/abilities-proofing.json`,
						wordpress(
							'abilities-proofing',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
					await require('./abilities-proofing.cjs')({
						write,
						env,
						mode,
						password: operationsPassword,
						runDir,
					});
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-css-ai.spec.cjs'
				) {
					write(
						`${mode}/abilities-css-ai.json`,
						wordpress(
							'abilities-css-ai',
							{
								MODULA_E2E_MODE: mode,
							},
							['--skip-plugins=mcp-adapter']
						)
					);
					await require('./abilities-css-ai.cjs')({
						write,
						env,
						mode,
						password: operationsPassword,
						runDir,
					});
				}
				if (
					!selectedSpec ||
					[
						'abilities-instagram-ai.spec.cjs',
						'abilities-ai-retirement.spec.cjs',
					].includes(selectedSpec)
				) {
					write(
						`${mode}/abilities-instagram-ai.json`,
						wordpress('abilities-instagram-ai', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-instagram-ai-native.json`,
						wordpress(
							'abilities-instagram-ai-native',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
					await require('./abilities-instagram-ai.cjs')({
						write,
						env,
						mode,
						password: operationsPassword,
						runDir,
					});
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-watermark-video.spec.cjs'
				) {
					write(
						`${mode}/abilities-watermark-video.json`,
						wordpress('abilities-watermark-video', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-watermark-video-native.json`,
						wordpress(
							'abilities-watermark-video-native',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
					await require('./abilities-watermark-video.cjs')({
						write,
						env,
						mode,
						password: operationsPassword,
						runDir,
						wordpress,
					});
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-cloud-jobs.spec.cjs'
				) {
					write(
						`${mode}/abilities-cloud-jobs.json`,
						wordpress('abilities-cloud-jobs', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-cloud-jobs-native-only.json`,
						wordpress(
							'abilities-cloud-jobs-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
					await require('./abilities-cloud-jobs.cjs')({
						write,
						env,
						mode,
						password: operationsPassword,
						runDir,
						wordpress,
					});
				}

				if (
					!selectedSpec ||
					[
						'abilities-storage.spec.cjs',
						'abilities-cloud-image.spec.cjs',
					].includes(selectedSpec)
				) {
					write(
						`${mode}/abilities-storage.json`,
						wordpress('abilities-storage', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-storage-native-only.json`,
						wordpress(
							'abilities-storage-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
					await require('./abilities-storage.cjs')({
						write,
						env,
						mode,
						password: operationsPassword,
						runDir,
					});
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-administration.spec.cjs'
				) {
					write(
						`${mode}/abilities-operations.json`,
						wordpress('abilities-operations', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-operations-native-only.json`,
						wordpress(
							'abilities-operations-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
					await require('./abilities-operations.cjs')({
						password: operationsPassword,
						wordpress,
						write,
						env,
						runDir,
						mode,
					});
					write(
						`${mode}/abilities-administration.json`,
						wordpress('abilities-administration', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-administration-native-only.json`,
						wordpress(
							'abilities-administration-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-media.spec.cjs'
				) {
					write(
						`${mode}/abilities-media.json`,
						wordpress('abilities-media', { MODULA_E2E_MODE: mode })
					);
					write(
						`${mode}/abilities-media-native-only.json`,
						wordpress(
							'abilities-media-native-only',
							{ MODULA_E2E_MODE: mode },
							[
								'--skip-plugins=mcp-adapter',
								'--exec=define("MEDIA_TRASH", true);',
							]
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-presets.spec.cjs'
				) {
					write(
						`${mode}/abilities-presets.json`,
						wordpress('abilities-presets', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-presets-native-only.json`,
						wordpress(
							'abilities-presets-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-albums.spec.cjs'
				) {
					write(
						`${mode}/abilities-albums.json`,
						wordpress('abilities-albums', { MODULA_E2E_MODE: mode })
					);
					write(
						`${mode}/abilities-albums-native-only.json`,
						wordpress(
							'abilities-albums-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (
					!selectedSpec ||
					selectedSpec === 'abilities-batch.spec.cjs'
				) {
					write(
						`${mode}/abilities-batch-crash.json`,
						wordpress('abilities-batch-crash', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-batch.json`,
						wordpress('abilities-batch', {
							MODULA_E2E_MODE: mode,
						})
					);
					write(
						`${mode}/abilities-batch-native-only.json`,
						wordpress(
							'abilities-batch-native-only',
							{ MODULA_E2E_MODE: mode },
							['--skip-plugins=mcp-adapter']
						)
					);
				}
				if (!nativeOnly)
					await command(
						process.execPath,
						process.argv.includes('--performance')
							? [path.join(__dirname, 'performance.cjs')]
							: [
									require.resolve('@playwright/test/cli'),
									'test',
									'--config',
									path.join(
										__dirname,
										'playwright.config.cjs'
									),
									...(selectedSpec ? [selectedSpec] : []),
								],
						liteRoot,
						null,
						{ MODULA_E2E_MODE: mode }
					);
			} finally {
				write(`${mode}/restoration.json`, wordpress('restore'));
			}
		}
	} finally {
		try {
			write('cleanup.json', wordpress('cleanup'));
			let debug;
			try {
				await cleanupProofingMail();
			} finally {
				debug = debugEvidence();
			}
			ownsLock = false;
			if (
				debug.databaseErrors ||
				debug.warnings ||
				debug.fatals ||
				debug.notices ||
				debug.deprecated
			) {
				throw new Error(
					`New PHP or database diagnostics in debug.log; see ${runDir}/debug-log.json`
				);
			}
		} finally {
			fs.rmSync(path.join(runDir, 'auth.json'), { force: true });
		}
	}
}

main().catch((error) => {
	console.error(error.message);
	if (ownsLock) {
		console.error(
			`Recover with: npm run test:wordpress-browser -- --cleanup ${run}`
		);
	}
	process.exitCode = 1;
});
