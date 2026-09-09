/**
 * Editor preview: move a gallery item to an adjacent numbered page (list order + perPage).
 *
 * @package
 */

import { applyCoreItemsToPreviewStore } from './applyCoreItemsToPreviewStore';
import { buildCustomGridRglLayout } from './customGridLayout';
import {
	asGalleryItemList,
	storeIndexToCoreIndex,
} from './galleryItemIdentity';
import { editorPreviewPageBreakStep } from './paginationFromSettings';
import { measureCustomGridPreviewWidth } from './repackCustomGridPreviewItems';
import { getForcedPreviewViewport } from './resolvePreviewViewport';

/**
 * Clear saved custom-grid cell placement for one numbered page slice.
 *
 * @param {Object[]} core
 * @param {number}   page    0-based
 * @param {number}   perPage
 */
function clearCustomGridCoordsOnPage(core, page, perPage) {
	if (!Array.isArray(core) || perPage < 1 || page < 0) {
		return;
	}
	const start = page * perPage;
	const end = Math.min(core.length, start + perPage);
	for (let i = start; i < end; i++) {
		const row = core[i];
		if (!row || typeof row !== 'object') {
			continue;
		}
		core[i] = {
			...row,
			gridX: '',
			gridY: '',
		};
	}
}

/**
 * @param {Object[]} core
 * @param {number}   fromIndex
 * @param {number}   targetPage 0-based page index
 * @param {number}   perPage
 * @return {{ core: Object[], sourcePage: number, targetPage: number }|null}
 */
export function moveCoreItemToPage(core, fromIndex, targetPage, perPage) {
	if (!Array.isArray(core) || perPage < 1) {
		return null;
	}
	if (fromIndex < 0 || fromIndex >= core.length) {
		return null;
	}
	const totalPages = Math.max(1, Math.ceil(core.length / perPage));
	if (targetPage < 0 || targetPage >= totalPages) {
		return null;
	}
	const sourcePage = Math.floor(fromIndex / perPage);
	if (sourcePage === targetPage) {
		return null;
	}

	const item = { ...core[fromIndex], gridX: '', gridY: '' };
	const next = core.slice();
	next.splice(fromIndex, 1);

	// Insert at the start of the target page (list order defines page membership).
	let insertAt = targetPage * perPage;
	if (fromIndex < insertAt) {
		insertAt -= 1;
	}
	insertAt = Math.max(0, Math.min(next.length, insertAt));
	next.splice(insertAt, 0, item);

	// Mixed pack would place a cleared tile under an existing packed row.
	// Clear both affected pages so the next pack fills each page cleanly.
	clearCustomGridCoordsOnPage(next, targetPage, perPage);
	clearCustomGridCoordsOnPage(next, sourcePage, perPage);

	return { core: next, sourcePage, targetPage };
}

/**
 * Pack cleared page chunks into `core` (mutates rows), then one store write.
 *
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {Object[]}                         core
 * @param {number[]}                         pageIndexes
 * @param {Object}                           config
 * @param {number}                           width
 * @param {number}                           perPage
 */
function repackCustomGridPages(
	store,
	core,
	pageIndexes,
	config,
	width,
	perPage
) {
	const uniquePages = [...new Set(pageIndexes)].sort((a, b) => a - b);
	const working = core.map((row) =>
		row && typeof row === 'object' ? { ...row } : row
	);

	for (const page of uniquePages) {
		if (page < 0 || perPage < 1) {
			continue;
		}
		const start = page * perPage;
		const end = Math.min(working.length, start + perPage);
		if (start >= end) {
			continue;
		}
		const chunk = working.slice(start, end);
		const { layout } = buildCustomGridRglLayout(chunk, width, config);
		if (!layout?.length) {
			continue;
		}
		chunk.forEach((item, idx) => {
			const cell = layout[idx];
			if (!cell || !item) {
				return;
			}
			working[start + idx] = {
				...item,
				gridX: cell.x,
				gridY: cell.y,
				width: cell.w,
				height: cell.h,
			};
		});
	}

	applyCoreItemsToPreviewStore(store, working);
}

/**
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {number}                           storeIndex Index in the preview catalog.
 * @param {'previous'|'next'}                direction
 * @return {boolean} True when the store was updated.
 */
export function movePreviewItemToAdjacentPage(store, storeIndex, direction) {
	if (!store) {
		return false;
	}
	const state = store.getState();
	const items = state.items?.items ?? [];
	const settings = state.gallery?.settings || {};
	const config = state.gallery?.config || {};
	const previewViewport = getForcedPreviewViewport(config);
	const perPage = editorPreviewPageBreakStep(
		settings,
		previewViewport ? { previewViewport } : {}
	);
	if (perPage === null) {
		return false;
	}
	const coreIndex = storeIndexToCoreIndex(items, storeIndex);
	if (coreIndex < 0) {
		return false;
	}
	const core = asGalleryItemList(items);
	const currentPage = Math.floor(coreIndex / perPage);
	const targetPage =
		direction === 'previous' ? currentPage - 1 : currentPage + 1;
	const moved = moveCoreItemToPage(core, coreIndex, targetPage, perPage);
	if (!moved) {
		return false;
	}

	if (config?.type === 'custom-grid') {
		repackCustomGridPages(
			store,
			moved.core,
			[moved.sourcePage, moved.targetPage],
			config,
			measureCustomGridPreviewWidth(),
			perPage
		);
	} else {
		applyCoreItemsToPreviewStore(store, moved.core);
	}
	return true;
}

/**
 * Whether Move to previous/next page actions apply for the current preview item.
 *
 * @param {Object[]|undefined} items
 * @param {number}             storeIndex
 * @param {Object}             settings
 * @param {Object}             [config]   Gallery config (previewViewport for editor).
 * @return {{ canPrevious: boolean, canNext: boolean }}
 */
export function getPreviewItemPageMoveAvailability(
	items,
	storeIndex,
	settings,
	config = {}
) {
	const previewViewport = getForcedPreviewViewport(config);
	const perPage = editorPreviewPageBreakStep(
		settings || {},
		previewViewport ? { previewViewport } : {}
	);
	if (perPage === null) {
		return { canPrevious: false, canNext: false };
	}
	const coreIndex = storeIndexToCoreIndex(items, storeIndex);
	if (coreIndex < 0) {
		return { canPrevious: false, canNext: false };
	}
	const coreLen = asGalleryItemList(items).length;
	const totalPages = Math.max(1, Math.ceil(coreLen / perPage));
	const currentPage = Math.floor(coreIndex / perPage);
	return {
		canPrevious: currentPage > 0,
		canNext: currentPage < totalPages - 1,
	};
}
