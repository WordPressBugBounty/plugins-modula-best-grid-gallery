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
	MODULA_E2E_RUN: run,
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
function wordpress(action, extra = {}) {
	const output = execFileSync(
		php,
		[
			'-c',
			path.join(localRoot, 'run', site.id, 'conf/php/php.ini'),
			wpCli,
			`--path=${wpPath}`,
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
			.update(execFileSync('git', ['diff', 'HEAD'], { cwd: root }))
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

async function main() {
	console.log(`WordPress E2E artifacts: ${runDir}`);
	if (recovery) {
		write('cleanup.json', wordpress('cleanup'));
		fs.rmSync(path.join(runDir, 'auth.json'), { force: true });
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
		if (!process.argv.includes('--skip-build')) {
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
			buildsReused: process.argv.includes('--skip-build'),
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
		const catalog = wordpress('seed');
		write('catalog.json', catalog);
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
		delete env.MODULA_E2E_PASSWORD;
		for (const mode of ['lite', 'pro']) {
			fs.mkdirSync(path.join(runDir, mode), { recursive: true });
			try {
				write(
					`${mode}/activation.json`,
					wordpress('mode', { MODULA_E2E_MODE: mode })
				);
				await command(
					process.execPath,
					process.argv.includes('--performance')
						? [path.join(__dirname, 'performance.cjs')]
						: [
								require.resolve('@playwright/test/cli'),
								'test',
								'--config',
								path.join(__dirname, 'playwright.config.cjs'),
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
			ownsLock = false;
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
