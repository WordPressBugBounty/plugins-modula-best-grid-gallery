const fs = require('fs');
const path = require('path');
const { test, expect } = require('./evidence.cjs');

const catalog = JSON.parse(
	fs.readFileSync(path.join(process.env.MODULA_E2E_RUN_DIR, 'catalog.json'))
);

/**
 * Unified Albums editor history: settings + custom-grid layout share one stack
 * with undo/redo, jump (truncates), and clear. Autosave echo must not wipe
 * valid history. Restored cells survive reopen.
 */
if (process.env.MODULA_E2E_MODE !== 'pro') {
	test('Lite mode has no album unified editor history journey', async ({
		page,
	}) => {
		await page.goto(catalog.pages.visible);
		await expect(
			page.locator('.modula-gallery-initialized, .modula-items').first()
		).toBeVisible();
	});
} else {
	test('album settings and custom-grid history undo jump clear and reopen', async ({
		page,
		evidence,
	}, testInfo) => {
		const album = catalog.albums?.betaPublicResult;
		expect(album?.id).toBeTruthy();
		expect(album?.editor).toBeTruthy();
		expect(album?.galleryA).toBeTruthy();
		expect(album?.galleryB).toBeTruthy();

		await page.goto(album.editor);
		await expect(
			page.locator('.modula-album-takeover__shell').first()
		).toBeVisible({ timeout: 60000 });
		await expect(
			page.locator(
				'[data-modula-album-canvas-layout="custom-grid"]'
			).first()
		).toBeVisible({ timeout: 60000 });

		const undoBtn = page.locator('[data-modula-album-history-undo]');
		const redoBtn = page.locator('[data-modula-album-history-redo]');
		await expect(undoBtn).toBeDisabled();
		await expect(redoBtn).toBeDisabled();

		const membersBefore = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		const cellBefore = Object.fromEntries(
			(membersBefore?.members || []).map((row) => [
				String(row.id),
				{
					gridX: row.gridX,
					gridY: row.gridY,
					width: row.width,
					height: row.height,
				},
			])
		);
		expect(cellBefore[String(album.galleryA)]).toEqual({
			gridX: 3,
			gridY: 2,
			width: 1,
			height: 1,
		});
		expect(cellBefore[String(album.galleryB)]).toEqual({
			gridX: 0,
			gridY: 0,
			width: 2,
			height: 2,
		});

		// Settings step: toggle responsive in Layout hub.
		await page
			.getByRole('button', { name: 'Open Layout settings' })
			.click();
		const responsiveToggle = page
			.locator('.modula-album-takeover__shell')
			.getByRole('switch')
			.first();
		await expect(responsiveToggle).toBeVisible({ timeout: 15000 });
		const responsiveBefore = await responsiveToggle.getAttribute(
			'aria-checked'
		);
		await responsiveToggle.click();
		await expect(responsiveToggle).not.toHaveAttribute(
			'aria-checked',
			responsiveBefore
		);
		await expect(undoBtn).toBeEnabled({ timeout: 5000 });

		await undoBtn.click();
		await expect(responsiveToggle).toHaveAttribute(
			'aria-checked',
			responsiveBefore
		);
		await expect(redoBtn).toBeEnabled();
		await redoBtn.click();
		await expect(responsiveToggle).not.toHaveAttribute(
			'aria-checked',
			responsiveBefore
		);

		// Layout step: drag a custom-grid tile.
		const tileA = page
			.locator('.modula-album-takeover__member-rgl-item')
			.filter({
				has: page.locator(
					`[data-modula-album-member-id="${album.galleryA}"]`
				),
			})
			.first();
		const tileFallback = page
			.locator('.modula-album-takeover__member-rgl-item')
			.nth(1);
		const dragTarget = (await tileA.count()) > 0 ? tileA : tileFallback;
		await expect(dragTarget).toBeVisible();

		const box = await dragTarget.boundingBox();
		expect(box).toBeTruthy();
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(
			box.x + box.width / 2 + 120,
			box.y + box.height / 2 + 40,
			{ steps: 12 }
		);
		await page.mouse.up();

		await expect(undoBtn).toBeEnabled({ timeout: 5000 });
		const stepLabel = page.locator(
			'.modula-album-takeover__status-bar-step'
		);
		await expect(stepLabel).toBeVisible({ timeout: 5000 });
		await expect(stepLabel).toContainText(/Move tile|Resize tile/i);

		// Jump popover: open, jump to earlier settings step, truncate later.
		await stepLabel.click();
		const popover = page.locator(
			'.modula-album-takeover__status-bar-history-popover'
		);
		await expect(popover).toBeVisible();
		const pastEntry = popover
			.locator('.modula-album-takeover__status-bar-history-entry.is-past')
			.first();
		await expect(pastEntry).toBeVisible();
		await pastEntry.click();
		await expect(popover).toHaveCount(0);
		await expect(redoBtn).toBeDisabled();

		// Make another settings change, wait briefly for autosave echo, history stays.
		await responsiveToggle.click();
		await expect(undoBtn).toBeEnabled({ timeout: 5000 });
		await page.waitForTimeout(1500);
		await expect(undoBtn).toBeEnabled();

		// Clear history.
		await stepLabel.click();
		await expect(popover).toBeVisible();
		await popover.getByRole('button', { name: 'Clear history' }).click();
		const confirm = page.getByRole('dialog').filter({
			hasText: /Clear editor history/i,
		});
		await expect(confirm).toBeVisible();
		await confirm.getByRole('button', { name: 'Clear history' }).click();
		await expect(undoBtn).toBeDisabled({ timeout: 5000 });
		await expect(redoBtn).toBeDisabled();

		// Persist a known layout via members PUT, reopen, cells survive.
		await page.evaluate(
			async ({ albumId, galleryA, galleryB, membersDoc }) => {
				const nextMembers = (membersDoc?.members || []).map((row) => {
					if (Number(row.id) === Number(galleryA)) {
						return {
							...row,
							width: 1,
							height: 1,
							gridX: 1,
							gridY: 0,
						};
					}
					if (Number(row.id) === Number(galleryB)) {
						return {
							...row,
							width: 2,
							height: 2,
							gridX: 0,
							gridY: 1,
						};
					}
					return row;
				});
				return window.wp.apiFetch({
					path: `/modula/v2/album/${albumId}/members`,
					method: 'PUT',
					data: { members: nextMembers },
				});
			},
			{
				albumId: album.id,
				galleryA: album.galleryA,
				galleryB: album.galleryB,
				membersDoc: membersBefore,
			}
		);

		await page.goto(album.editor);
		await expect(
			page.locator(
				'[data-modula-album-canvas-layout="custom-grid"]'
			).first()
		).toBeVisible({ timeout: 60000 });

		const membersAfter = await page.evaluate(async (albumId) => {
			return window.wp.apiFetch({
				path: `/modula/v2/album/${albumId}/members`,
			});
		}, album.id);
		const cellAfter = Object.fromEntries(
			(membersAfter?.members || []).map((row) => [
				String(row.id),
				{
					gridX: row.gridX,
					gridY: row.gridY,
					width: row.width,
					height: row.height,
				},
			])
		);
		expect(cellAfter[String(album.galleryA)]).toEqual({
			gridX: 1,
			gridY: 0,
			width: 1,
			height: 1,
		});
		expect(cellAfter[String(album.galleryB)]).toEqual({
			gridX: 0,
			gridY: 1,
			width: 2,
			height: 2,
		});

		await evidence.capture(page, 'album-unified-history-reopen');
		await testInfo.attach('album-unified-history-summary', {
			body: Buffer.from(
				JSON.stringify(
					{
						albumId: album.id,
						responsiveBefore,
						cellBefore,
						cellAfter,
					},
					null,
					2
				),
				'utf8'
			),
			contentType: 'application/json',
		});
	});
}
