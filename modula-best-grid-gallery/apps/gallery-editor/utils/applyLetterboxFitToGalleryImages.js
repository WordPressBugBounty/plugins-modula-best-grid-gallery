/**
 * Apply custom-grid letterbox (`tile_image_fit: contain`) to gallery images.
 */

import {
	TILE_IMAGE_FIT_CONTAIN,
	asGalleryItemList,
	isEmbeddedGalleryItemRow,
} from 'gallery-shared/preview';
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
 * @param {Object[]|null|undefined}      items         Redux `items.items`
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
 * Forget the crop area kept for the focus dialog of every eligible image
 * except `excludeItemId`: letterbox replaces their crop.
 *
 * @param {{
 *   galleryId: number,
 *   items: Object[],
 *   excludeItemId: string|number|null|undefined,
 * }} args
 */
export function clearOtherLetterboxFocusSessions({
	galleryId,
	items,
	excludeItemId,
}) {
	const excludeId =
		excludeItemId !== undefined && excludeItemId !== null
			? String(excludeItemId)
			: '';
	for (const row of asGalleryItemList(items)) {
		if (
			isLetterboxApplyEligibleRow(row) &&
			!(excludeId && String(row.id) === excludeId)
		) {
			clearLetterboxFocusSessionForItem(galleryId, row);
		}
	}
}

/**
 * Optimistically merge letterbox fields onto every eligible row except optional exclude id.
 *
 * @param {Object[]}                      core
 * @param {Record<string, string|number>} fields
 * @param {string|number|null|undefined}  excludeItemId
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
