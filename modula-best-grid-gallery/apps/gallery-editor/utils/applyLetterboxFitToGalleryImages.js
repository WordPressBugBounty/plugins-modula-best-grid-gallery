/**
 * Apply custom-grid letterbox (`tile_image_fit: contain`) to gallery images.
 */

import {
	TILE_IMAGE_FIT_CONTAIN,
	asGalleryItemList,
	isEmbeddedGalleryItemRow,
	modulaImagesRowIndexForPreviewWrite,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { __ } from '@wordpress/i18n';
import { galleryPatchImageByIndex } from '../api/galleryUploadApi';
import {
	commitPreviewCatalog,
	mergeModulaRowIntoPreviewItem,
} from './previewItemsCommit';
import {
	clearFocusCropAreaFromSession,
	getFocusCropStorageKey,
} from './focusPointCrop';

/**
 * @param {Object|null|undefined} row
 * @return {boolean}
 */
export function isLetterboxApplyEligibleRow(row) {
	if (!row) {
		return false;
	}
	if (isEmbeddedGalleryItemRow(row)) {
		return false;
	}
	const id = row.id;
	return id !== undefined && id !== null && String(id).trim() !== '';
}

/**
 * @param {Object[]|null|undefined} items Redux `items.items`
 * @param {string|number|null|undefined} currentItemId
 * @return {number}
 */
export function countOtherLetterboxEligibleImages(items, currentItemId) {
	const core = asGalleryItemList(items);
	const currentId =
		currentItemId !== undefined && currentItemId !== null
			? String(currentItemId)
			: '';
	let count = 0;
	for (const row of core) {
		if (!isLetterboxApplyEligibleRow(row)) {
			continue;
		}
		if (currentId && String(row.id) === currentId) {
			continue;
		}
		count++;
	}
	return count;
}

/**
 * @param {{ x: number, y: number }} focal
 * @return {Record<string, string|number>}
 */
export function buildLetterboxPatchFields(focal) {
	return {
		tile_image_fit: TILE_IMAGE_FIT_CONTAIN,
		focal_x: focal.x,
		focal_y: focal.y,
		focal_crop_x: '',
		focal_crop_y: '',
		focal_crop_w: '',
		focal_crop_h: '',
	};
}

/**
 * @param {number} galleryId
 * @param {Object} item
 */
function clearLetterboxFocusSessionForItem(galleryId, item) {
	const key = getFocusCropStorageKey(galleryId, item);
	if (key) {
		clearFocusCropAreaFromSession(key);
	}
}

/**
 * Patch letterbox fields on every eligible image except `excludeItemId` (already saved).
 *
 * @param {{
 *   galleryId: number,
 *   store: import('@reduxjs/toolkit').Store,
 *   fields: Record<string, string|number>,
 *   excludeItemId: string|number|null|undefined,
 * }} args
 * @return {Promise<void>}
 */
export async function applyLetterboxFitToOtherGalleryImages({
	galleryId,
	store,
	fields,
	excludeItemId,
}) {
	if (!galleryId || !store || !fields) {
		return;
	}
	const excludeId =
		excludeItemId !== undefined && excludeItemId !== null
			? String(excludeItemId)
			: '';

	const itemsLive = store.getState().items.items;
	const core = asGalleryItemList(itemsLive);
	const targets = [];

	for (let coreIndex = 0; coreIndex < core.length; coreIndex++) {
		const row = core[coreIndex];
		if (!isLetterboxApplyEligibleRow(row)) {
			continue;
		}
		if (excludeId && String(row.id) === excludeId) {
			continue;
		}
		const storeIndex = itemsLive.findIndex(
			(it) => it && String(it.id) === String(row.id)
		);
		if (storeIndex < 0) {
			continue;
		}
		const restRowIndex = modulaImagesRowIndexForPreviewWrite(
			itemsLive,
			storeIndex
		);
		const displayCoreIndex = storeIndexToCoreIndex(itemsLive, storeIndex);
		if (restRowIndex < 0 || displayCoreIndex < 0) {
			continue;
		}
		targets.push({ row, storeIndex, restRowIndex, displayCoreIndex });
	}

	for (const target of targets) {
		const res = await galleryPatchImageByIndex(
			galleryId,
			target.restRowIndex,
			fields
		);
		const patchRow = res?.image;
		if (!patchRow) {
			throw new Error(
				__(
					'Could not apply letterbox to all images (empty server response).',
					'modula-best-grid-gallery'
				)
			);
		}
		const nextCore = asGalleryItemList(store.getState().items.items);
		const prevItem = nextCore[target.displayCoreIndex];
		if (!prevItem) {
			continue;
		}
		nextCore[target.displayCoreIndex] = mergeModulaRowIntoPreviewItem(
			prevItem,
			patchRow
		);
		commitPreviewCatalog(store, nextCore);
		clearLetterboxFocusSessionForItem(galleryId, prevItem);
	}
}

/**
 * Optimistically merge letterbox fields onto every eligible row except optional exclude id.
 *
 * @param {Object[]} core
 * @param {Record<string, string|number>} fields
 * @param {string|number|null|undefined} excludeItemId
 * @return {Object[]}
 */
export function mergeLetterboxFieldsIntoCoreItems(core, fields, excludeItemId) {
	const excludeId =
		excludeItemId !== undefined && excludeItemId !== null
			? String(excludeItemId)
			: '';
	return core.map((row) => {
		if (!isLetterboxApplyEligibleRow(row)) {
			return row;
		}
		if (excludeId && String(row.id) === excludeId) {
			return row;
		}
		return { ...row, ...fields };
	});
}
