/**
 * Full custom-grid repack for editor preview (e.g. after gallery type change).
 *
 * Only runs when items have no saved custom-grid placement (gridX/gridY).
 * Existing layouts are preserved when switching back to custom grid.
 *
 * @package
 */

import { asGalleryItemList } from './galleryItemIdentity';
import { applyCoreItemsToPreviewStore } from './applyCoreItemsToPreviewStore';
import { applyCustomGridLayoutSectionToStore } from './applyCustomGridLayoutSectionToStore';
import {
	buildCustomGridRglLayout,
	itemHasSavedCustomGridPlacement,
} from './customGridLayout';
import { previewCatalogPagesFromGalleryState } from './previewCatalogPages';

/** Fallback when preview container is not measured yet. */
export const CUSTOM_GRID_REPACK_FALLBACK_WIDTH = 1200;

/** @type {string|null} */
let pendingRepackFromGalleryType = null;

/**
 * @param {unknown} prevType
 * @param {unknown} nextType
 * @return {boolean}
 */
export function shouldRepackCustomGridOnGalleryTypeChange(prevType, nextType) {
	const prev = String(prevType ?? '');
	const next = String(nextType ?? '');
	return next === 'custom-grid' && prev !== '' && prev !== 'custom-grid';
}

/**
 * @param {unknown} items Gallery item rows (display or core list).
 * @return {boolean} True when at least one row has saved gridX/gridY.
 */
export function itemsHaveSavedCustomGridLayout(items) {
	const core = asGalleryItemList(Array.isArray(items) ? items : []);
	if (!core.length) {
		return false;
	}
	return core.some(itemHasSavedCustomGridPlacement);
}

/**
 * Mark that the next custom-grid preview mount should repack (sidebar type change).
 *
 * @param {unknown} prevType
 * @param {unknown} nextType
 * @param {unknown} [items]  Preview/store item rows used to skip when layout exists.
 */
export function markCustomGridRepackAfterGalleryTypeChange(
	prevType,
	nextType,
	items
) {
	if (!shouldRepackCustomGridOnGalleryTypeChange(prevType, nextType)) {
		return;
	}
	if (itemsHaveSavedCustomGridLayout(items)) {
		return;
	}
	pendingRepackFromGalleryType = String(prevType ?? '');
}

/**
 * @return {boolean} True when a repack was requested and the flag is now cleared.
 */
export function consumeCustomGridRepackPending() {
	if (pendingRepackFromGalleryType === null) {
		return false;
	}
	pendingRepackFromGalleryType = null;
	return true;
}

/**
 * @param {Object} row
 * @return {Object}
 */
function stripCustomGridLayoutFields(row) {
	if (!row || typeof row !== 'object') {
		return row;
	}
	const next = { ...row };
	delete next.gridX;
	delete next.gridY;
	delete next.gridLocked;
	delete next.grid_locked;

	const w = parseInt(next.width, 10);
	const h = parseInt(next.height, 10);
	if (!Number.isFinite(w) || w > 12 || w < 2) {
		next.width = 2;
	}
	if (!Number.isFinite(h) || h > 12 || h < 2) {
		next.height = 2;
	}
	return next;
}

/**
 * Clear gridX/gridY only (keep locks + spans). Used when toggling pagination.
 *
 * @param {Object} row
 * @return {Object}
 */
function clearCustomGridPositionFields(row) {
	if (!row || typeof row !== 'object') {
		return row;
	}
	const next = { ...row, gridX: '', gridY: '' };
	const w = parseInt(next.width, 10);
	const h = parseInt(next.height, 10);
	if (!Number.isFinite(w) || w > 12 || w < 2) {
		next.width = 2;
	}
	if (!Number.isFinite(h) || h > 12 || h < 2) {
		next.height = 2;
	}
	return next;
}

/**
 * @param {number} containerWidth
 * @return {number}
 */
function resolveRepackWidth(containerWidth) {
	return Number.isFinite(containerWidth) && containerWidth > 0
		? containerWidth
		: CUSTOM_GRID_REPACK_FALLBACK_WIDTH;
}

/**
 * Measure custom-grid preview scale inner width (editor takeover).
 *
 * @return {number}
 */
export function measureCustomGridPreviewWidth() {
	if (typeof document === 'undefined') {
		return CUSTOM_GRID_REPACK_FALLBACK_WIDTH;
	}
	const el = document.querySelector(
		'.modula-custom-grid__preview-scale-inner'
	);
	if (el instanceof HTMLElement) {
		const w = el.getBoundingClientRect().width;
		if (Number.isFinite(w) && w >= 280) {
			return Math.round(w);
		}
	}
	return CUSTOM_GRID_REPACK_FALLBACK_WIDTH;
}

/**
 * @param {import('@reduxjs/toolkit').Store} store  Gallery Redux store.
 * @param {Object}                           config Gallery flat config.
 * @return {Object[][]} Page groups from the current store catalog.
 */
function previewCatalogChunksFromStore(store, config) {
	const state = store.getState();
	return previewCatalogPagesFromGalleryState(state?.items?.items ?? [], {
		settings: state?.gallery?.settings,
		metadata: state?.gallery?.metadata,
		config,
	});
}

/**
 * Pack every preview catalog page after coords were cleared.
 *
 * @param {import('@reduxjs/toolkit').Store} store  Gallery Redux store.
 * @param {Object}                           config Gallery flat config.
 * @param {number}                           width  Packer width in px.
 * @return {void} Nothing.
 */
function packAllCustomGridSections(store, config, width) {
	const sectionCount = previewCatalogChunksFromStore(store, config).length;

	for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
		const chunks = previewCatalogChunksFromStore(store, config);
		const chunk = chunks[sectionIndex];
		if (!chunk?.length) {
			continue;
		}
		const { layout } = buildCustomGridRglLayout(chunk, width, config);
		if (!layout?.length) {
			continue;
		}
		applyCustomGridLayoutSectionToStore(
			store,
			sectionIndex,
			layout,
			chunks
		);
	}
}

/**
 * Clear saved grid positions and run first-fit pack for every pagination section.
 *
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {Object}                           config         Gallery config (columns, gutter, type).
 * @param {number}                           containerWidth Measured preview width (px).
 * @return {boolean} True when items were repacked.
 */
export function repackCustomGridPreviewItems(store, config, containerWidth) {
	if (!store) {
		return false;
	}
	const width = resolveRepackWidth(containerWidth);

	const core = asGalleryItemList(store.getState()?.items?.items ?? []);
	if (!core.length) {
		return false;
	}
	if (itemsHaveSavedCustomGridLayout(core)) {
		return false;
	}

	const cleared = core.map(stripCustomGridLayoutFields);
	applyCoreItemsToPreviewStore(store, cleared);
	packAllCustomGridSections(store, config, width);

	return true;
}

/**
 * After enabling pagination on custom-grid: clear absolute coords and pack each page independently.
 *
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {Object}                           config           Gallery config.
 * @param {number}                           [containerWidth]
 * @return {boolean}
 */
export function repackCustomGridAfterPaginationEnable(
	store,
	config,
	containerWidth
) {
	if (!store || config?.type !== 'custom-grid') {
		return false;
	}
	const width = resolveRepackWidth(containerWidth);
	const core = asGalleryItemList(store.getState()?.items?.items ?? []);
	if (!core.length) {
		return false;
	}

	const cleared = core.map(clearCustomGridPositionFields);
	applyCoreItemsToPreviewStore(store, cleared);
	packAllCustomGridSections(store, config, width);
	return true;
}

/**
 * After disabling pagination on custom-grid: reflow all items into one continuous packed layout.
 *
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {Object}                           config           Gallery config.
 * @param {number}                           [containerWidth]
 * @return {boolean}
 */
export function reflowCustomGridAfterPaginationDisable(
	store,
	config,
	containerWidth
) {
	if (!store || config?.type !== 'custom-grid') {
		return false;
	}
	const width = resolveRepackWidth(containerWidth);
	const core = asGalleryItemList(store.getState()?.items?.items ?? []);
	if (!core.length) {
		return false;
	}

	const cleared = core.map(clearCustomGridPositionFields);
	applyCoreItemsToPreviewStore(store, cleared);

	const chunks = previewCatalogChunksFromStore(store, config);
	// Pagination off → one chunk of the full catalog.
	const chunk = chunks[0] ?? cleared;
	if (!chunk.length) {
		return false;
	}
	const { layout } = buildCustomGridRglLayout(chunk, width, config);
	if (!layout?.length) {
		return false;
	}
	applyCustomGridLayoutSectionToStore(store, 0, layout, [chunk]);
	return true;
}
