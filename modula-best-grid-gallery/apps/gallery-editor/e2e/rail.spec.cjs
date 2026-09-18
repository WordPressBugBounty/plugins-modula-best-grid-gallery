const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const buildPath = path.resolve(
	__dirname,
	'../../../.scratch/compact-takeover-sidebar/browser-build'
);
const visualsPath = path.resolve(
	__dirname,
	'../../../.scratch/compact-takeover-sidebar/visuals'
);

async function capture(page, name) {
	fs.mkdirSync(visualsPath, { recursive: true });
	await page.screenshot({
		path: path.join(visualsPath, `${name}.png`),
		animations: 'disabled',
	});
}

async function openRail(page, { width = 1440, height = 1000 } = {}) {
	await page.setViewportSize({ width, height });
	await page.route('https://modula.test/**', async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname === '/wp-components.css') {
			return route.fulfill({
				path: path.resolve(
					__dirname,
					'../../../node_modules/@wordpress/components/build-style/style.css'
				),
				contentType: 'text/css; charset=utf-8',
			});
		}
		if (url.pathname.startsWith('/assets/')) {
			const name = path.basename(url.pathname);
			return route.fulfill({
				path: path.join(buildPath, name),
				contentType: name.endsWith('.js')
					? 'application/javascript; charset=utf-8'
					: 'text/css; charset=utf-8',
			});
		}
		const css = fs
			.readdirSync(buildPath)
			.filter((name) => name.endsWith('.css') && !name.includes('-rtl'));
		return route.fulfill({
			contentType: 'text/html',
			body: `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/wp-components.css">${css
				.map((name) => `<link rel="stylesheet" href="/assets/${name}">`)
				.join(
					''
				)}<style>html,body,#modula-gallery-editor-rail-root{height:100%;margin:0}body{font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.modula-gallery-takeover__shell{display:flex;flex-direction:column;height:100%}</style></head><body><div id="modula-gallery-editor-rail-root"></div><script src="/assets/rail.js"></script></body></html>`,
		});
	});
	await page.goto('https://modula.test/');
	await expect(
		page.getByRole('navigation', { name: 'Settings sections' })
	).toBeVisible();
}

test.describe('Gallery editor compact sidebar rail', () => {
	for (const width of [1025, 1280, 1440, 1920]) {
		test(`keeps a fixed 72px icon-only rail at ${width}px`, async ({
			page,
		}) => {
			await openRail(page, { width });
			const navColumn = page.locator(
				'.modula-gallery-takeover__sidebar-v2-nav-column'
			);
			const panel = page.getByTestId('settings-panel-slot');
			const canvas = page.getByTestId('editor-canvas');
			const navBox = await navColumn.boundingBox();
			const panelBox = await panel.boundingBox();
			const canvasBox = await canvas.boundingBox();
			expect(navBox.width).toBeGreaterThanOrEqual(71);
			expect(navBox.width).toBeLessThanOrEqual(73);
			expect(panelBox.width).toBeGreaterThanOrEqual(299);
			expect(panelBox.width).toBeLessThanOrEqual(301);
			expect(canvasBox.width).toBeGreaterThan(
				width - navBox.width - panelBox.width - 40
			);
			await expect(
				page
					.locator('.modula-gallery-takeover__sidebar-v2-nav-title')
					.first()
			).toBeVisible();
			await expect(
				page.getByText('Layout', { exact: true }).first()
			).toBeVisible();
			await expect(
				page.locator('.modula-gallery-takeover__sidebar--rail-compact')
			).toHaveCount(0);
			await capture(page, `gallery-rail-${width}`);
		});
	}

	test('exposes accessible names and footer icons without category tooltips', async ({
		page,
	}) => {
		await openRail(page, { width: 1440 });
		const general = page.getByRole('button', {
			name: 'Open Layout settings',
		});
		await expect(general).toBeVisible();
		await general.focus();
		await expect(general).toHaveAttribute('aria-current', 'true');
		await general.hover();
		await expect(page.locator('.components-tooltip')).toHaveCount(0);
		await expect(
			page.getByRole('link', { name: 'Documentation', exact: true })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Appearance', exact: true })
		).toBeVisible();
		await page
			.getByRole('button', { name: 'Appearance', exact: true })
			.click();
		await expect(
			page.getByRole('menu', { name: 'Appearance' })
		).toBeVisible();
		await capture(page, 'gallery-rail-a11y');
	});

	test('keeps footer controls reachable at a short height', async ({
		page,
	}) => {
		await openRail(page, { width: 1280, height: 520 });
		await expect(
			page.getByRole('link', { name: 'Documentation', exact: true })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Appearance', exact: true })
		).toBeVisible();
		await capture(page, 'gallery-rail-short-height');
	});
});
