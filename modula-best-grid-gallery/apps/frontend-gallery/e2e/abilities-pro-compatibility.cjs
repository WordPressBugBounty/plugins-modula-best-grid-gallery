/* Actual package boot under the shared runner's lock, fixture ownership and cleanup. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { request } = require('@playwright/test');
module.exports = async ({ wordpress, write, env, runDir, proRoot }) => {
	const oldCommit = 'bff39529d5233afabae6d283a20790be5b507ba2';
	const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
		cwd: proRoot,
		encoding: 'utf8',
	}).trim();
	assert.equal(
		execFileSync(
			'git',
			[
				'diff',
				oldCommit,
				currentCommit,
				'--',
				'composer.json',
				'composer.lock',
			],
			{ cwd: proRoot, encoding: 'utf8' }
		),
		'',
		'Reused vendor requires unchanged Composer dependency contract.'
	);
	function packageAt(profile, commit) {
		const root = path.join(runDir, 'packages', profile);
		fs.mkdirSync(root, { recursive: true });
		const archive = execFileSync('git', ['archive', commit], {
			cwd: proRoot,
			maxBuffer: 256 * 1024 * 1024,
		});
		execFileSync('tar', ['-xf', '-', '-C', root], { input: archive });
		// Composer uses archive-relative baseDir. Prune missing entries so this
		// build's classmap cannot attempt to load a newer, absent source file.
		fs.cpSync(
			path.join(proRoot, 'includes/vendor'),
			path.join(root, 'includes/vendor'),
			{ recursive: true }
		);
		for (const file of ['autoload_classmap.php', 'autoload_static.php']) {
			const target = path.join(root, 'includes/vendor/composer', file);
			let source = fs.readFileSync(target, 'utf8');
			assert.ok(
				!source.includes(proRoot),
				'Autoloader must not reference workspace source.'
			);
			source = source
				.split('\n')
				.filter((line) => {
					const match = line.match(
						/=>.*['"](\/includes\/[^'"]+)['"]/
					);
					return !match || fs.existsSync(root + match[1]);
				})
				.join('\n');
			fs.writeFileSync(target, source);
		}
		// The checkout's ignored built PHP manifests are runtime dependencies.
		function copyManifests(directory) {
			for (const entry of fs.readdirSync(path.join(proRoot, directory), {
				withFileTypes: true,
			})) {
				const relative = path.join(directory, entry.name);
				if (entry.isDirectory() && entry.name !== 'vendor') {
					copyManifests(relative);
				} else if (
					entry.isFile() &&
					entry.name.endsWith('.asset.php') &&
					!fs.existsSync(path.join(root, relative))
				) {
					fs.mkdirSync(path.dirname(path.join(root, relative)), {
						recursive: true,
					});
					fs.copyFileSync(
						path.join(proRoot, relative),
						path.join(root, relative)
					);
				}
			}
		}
		copyManifests('includes');
		return root;
	}
	const profiles = [
		'old',
		'missing-extensions',
		'missing-licensing',
		'missing-cache',
		'missing-writer',
		'missing-uploader',
		'missing-watermark',
		'required-argument',
		'below-floor',
	];
	for (const profile of profiles) {
		const root = packageAt(
			profile,
			profile === 'old' ? oldCommit : currentCommit
		);
		const edits = {
			'missing-extensions': [
				'includes/extensions/class-extensions.php',
				'function get_read_only_extension_status(',
				'function unavailable_extension_status(',
			],
			'missing-licensing': [
				'includes/extensions/class-licensing.php',
				'function get_read_only_status(',
				'function unavailable_license_status(',
			],
			'missing-cache': [
				'includes/extensions/class-extensions.php',
				'function clear_active_extensions_cache(',
				'function unavailable_cache(',
			],
			'missing-writer': [
				'includes/extensions/albums/v2/class-settings-writer.php',
				'function patch(',
				'function unavailable_patch(',
			],
			'missing-uploader': [
				'includes/extensions/instagram/class-image-handler.php',
				'function upload_item_from_url(',
				'function unavailable_upload(',
			],
			'missing-watermark': [
				'includes/extensions/watermark/class-watermark.php',
				'function remove_watermark_from_image(',
				'function unavailable_remove(',
			],
			'required-argument': [
				'includes/extensions/class-licensing.php',
				'function get_read_only_status()',
				'function get_read_only_status( $required )',
			],
			'below-floor': [
				'bootstrap.php',
				"define( 'MODULA_PRO_VERSION', '3.0.12' );",
				'// Version supplied by the owned below-floor fixture.',
			],
		};
		if (edits[profile]) {
			const [file, before, after] = edits[profile];
			const target = path.join(root, file);
			const text = fs.readFileSync(target, 'utf8');
			assert.ok(
				text.includes(before),
				'Expected fixture source: ' + profile
			);
			let edited = text.replace(before, after);
			// Keep unrelated internal Pro bootstrap calls functional while the public
			// service entry point is absent from this controlled partial package.
			if (profile === 'missing-cache') {
				edited = edited.replaceAll(
					'->clear_active_extensions_cache()',
					'->unavailable_cache()'
				);
			}
			fs.writeFileSync(target, edited);
		}
	}
	write('pro-package.json', {
		oldCommit,
		currentCommit,
		oldVersion: '3.0.10',
		dependencies:
			'Installed vendor reused; identical composer.json/lock; relative classmaps pruned against package source.',
		provenance:
			'Actual old Git source snapshot, not a downloaded released ZIP.',
		profiles,
	});
	wordpress('abilities-pro-compatibility-prepare');
	wordpress('abilities-transport-prepare');
	const run = env.MODULA_E2E_RUN;
	const catalog = JSON.parse(
		fs.readFileSync(path.join(runDir, 'catalog.json'))
	);
	const http = await request.newContext({
		baseURL: 'http://localhost:10003',
	});
	try {
		await http.get('/wp-login.php');
		await http.post('/wp-login.php', {
			form: {
				log: run,
				pwd: env.MODULA_E2E_PASSWORD,
				'wp-submit': 'Log In',
				testcookie: '1',
			},
		});
		const nonce = (
			await (
				await http.get('/wp-admin/admin-ajax.php?action=rest-nonce')
			).text()
		).trim();
		assert.match(nonce, /^[a-f0-9]{10}$/);
		for (const profile of [...profiles, 'absent', 'current']) {
			wordpress('mode', {
				MODULA_E2E_MODE: profile === 'absent' ? 'lite' : 'pro',
			});
			const headers = {
				'X-Modula-E2E-Run': run,
				'X-Modula-E2E-Pro-Profile': profile,
				'X-WP-Nonce': nonce,
				'MCP-Protocol-Version': '2025-06-18',
			};
			const native = wordpress(
				'abilities-pro-compatibility',
				{ MODULA_E2E_PRO_PROFILE: profile },
				['--skip-plugins=mcp-adapter']
			);
			write(`${profile}-native.json`, native);
			if (profile === 'old') {
				assert.ok(
					native.extensions_source.startsWith(
						path.join(runDir, 'packages/old/')
					),
					'Actual old class must be loaded from the snapshot.'
				);
			}
			const admin = await http.get('/wp-admin/index.php', { headers });
			assert.equal(admin.status(), 200);
			const adminText = await admin.text();
			assert.ok(
				!adminText.includes('There has been a critical error'),
				'Admin boot has no critical-error screen.'
			);
			assert.equal(
				adminText.includes('Update Modula PRO to use its integrations'),
				false,
				profile + ' does not explain Abilities to administrators'
			);
			const visitor = await request.newContext({
				baseURL: 'http://localhost:10003',
			});
			try {
				const response = await visitor.get(catalog.pages.visible, {
					headers: {
						'X-Modula-E2E-Run': run,
						'X-Modula-E2E-Pro-Profile': profile,
					},
				});
				assert.equal(response.status(), 200);
				const html = await response.text();
				assert.ok(
					html.includes(
						`id="modula-${catalog.galleries.visible.id}"`
					),
					'Owned public gallery root renders.'
				);
				const galleryHtml = html.slice(
					html.indexOf(`id="modula-${catalog.galleries.visible.id}"`)
				);
				const imageTags = [
					...galleryHtml.matchAll(/<img\b[^>]*>/g),
				].map((match) => match[0]);
				write(`${profile}-public-images.json`, imageTags);
				assert.ok(
					imageTags.some((tag) => tag.includes(`/${run}/image-1`)),
					'Owned public image URL renders in an image element.'
				);
				assert.ok(
					!html.includes('There has been a critical error'),
					'Public boot has no critical-error screen.'
				);
				assert.ok(
					!html.includes('Update Modula PRO to use its integrations')
				);
			} finally {
				await visitor.dispose();
			}
			if (!native.abilities_active) {
				write(`${profile}-http.json`, {
					public_status: 200,
					admin_status: 200,
					administrator_notice: false,
					abilities_active: false,
					mcp_discovery: false,
					mcp_gallery_read: false,
				});
				continue;
			}
			let session;
			async function rpc(method, params) {
				const response = await http.post(
					'/wp-json/mcp/mcp-adapter-default-server',
					{
						headers: {
							...headers,
							...(session ? { 'Mcp-Session-Id': session } : {}),
						},
						data: { jsonrpc: '2.0', id: 1, method, params },
					}
				);
				assert.equal(response.status(), 200, await response.text());
				session = response.headers()['mcp-session-id'] || session;
				const body = await response.json();
				assert.equal(body.error, undefined, JSON.stringify(body));
				return body.result;
			}
			async function call(name, parameters) {
				const result = await rpc('tools/call', {
					name: 'mcp-adapter-execute-ability',
					arguments: { ability_name: `modula/${name}`, parameters },
				});
				const body =
					result.structuredContent ||
					JSON.parse(result.content[0].text);
				assert.notEqual(result.isError, true, JSON.stringify(body));
				assert.notEqual(body.success, false, JSON.stringify(body));
				return body.data;
			}
			await rpc('initialize', {
				protocolVersion: '2025-06-18',
				capabilities: {},
				clientInfo: { name: 'Pro package compatibility', version: '1' },
			});
			const discovery = await call('discover', { per_page: 100 });
			assert.deepEqual(discovery.features, native.features);
			const read = await call('read-gallery', {
				id: catalog.galleries.visible.id,
			});
			assert.equal(read.gallery.id, catalog.galleries.visible.id);
			write(`${profile}-http.json`, {
				public_status: 200,
				admin_status: 200,
				administrator_notice: native.notice,
				mcp_discovery: true,
				mcp_gallery_read: true,
			});
		}
	} finally {
		await http.dispose();
	}
};
