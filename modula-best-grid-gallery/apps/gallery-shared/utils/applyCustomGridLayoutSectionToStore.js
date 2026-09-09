/**
 * Persist react-grid-layout drag/resize into Redux item rows (gridX/gridY/width/height).
 *
 * @package
 */

import { asGalleryItemList } from './galleryItemIdentity';
import { buildCustomGridLayoutKeys } from './customGridLayout';
import { applyCoreItemsToPreviewStore } from './applyCoreItemsToPreviewStore';

/**
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {number} sectionIndex
 * @param {ReadonlyArray<{ i: string, x: number, y: number, w: number, h: number }>} layout
 * @param {Array<Array<Object>>} chunks
 */
export function applyCustomGridLayoutSectionToStore(
	store,
	sectionIndex,
	layout,
	chunks
) {
	if (!store || !Array.isArray(layout) || !Array.isArray(chunks)) {
		return;
	}
	const chunk = chunks[sectionIndex];
	if (!chunk?.length) {
		return;
	}

	const keys = buildCustomGridLayoutKeys(chunk);
	const layoutByKey = new Map(layout.map((cell) => [String(cell.i), cell]));

	const updatedChunk = chunk.map((item, idx) => {
		const key = keys[idx];
		const cell = layoutByKey.get(key);
		if (!cell) {
			return item;
		}
		return {
			...item,
			gridX: cell.x,
			gridY: cell.y,
			width: cell.w,
			height: cell.h,
		};
	});

	const newChunks = chunks.map((section, i) =>
		i === sectionIndex ? updatedChunk : section
	);
	const newCore = newChunks.flat();
	const state = store.getState();
	const currentCore = asGalleryItemList(state.items.items);
	if (
		currentCore.length === newCore.length &&
		newCore.every((row, i) => {
			const prev = currentCore[i];
			if (!prev || !row) {
				return false;
			}
			return (
				prev.id === row.id &&
				prev.gridX === row.gridX &&
				prev.gridY === row.gridY &&
				prev.width === row.width &&
				prev.height === row.height
			);
		})
	) {
		return;
	}

	applyCoreItemsToPreviewStore(store, newCore);
}
