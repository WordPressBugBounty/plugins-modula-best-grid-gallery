/**
 * Prev/next navigation helpers for the unified gallery item edit modal.
 */
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
} from './embeddedGalleryItems';

/**
 * @param {unknown} row
 * @return {'image'|'content-block'|null} Editable item kind or null when unsupported.
 */
export function getGalleryItemEditKind(row) {
	if (!row || typeof row !== 'object') {
		return null;
	}
	if (isContentBlockGalleryItemRow(row)) {
		return 'content-block';
	}
	if (!isEmbeddedGalleryItemRow(row)) {
		return 'image';
	}
	return null;
}

/**
 * Store indices for images and content blocks in gallery order (skips page breaks and other embedded rows).
 *
 * @param {Object[]|undefined|null} reduxItems
 * @return {number[]} Store indices for images and content blocks in order.
 */
export function getEditableGalleryItemIndices(reduxItems) {
	if (!Array.isArray(reduxItems)) {
		return [];
	}
	const out = [];
	for (let i = 0; i < reduxItems.length; i++) {
		if (getGalleryItemEditKind(reduxItems[i])) {
			out.push(i);
		}
	}
	return out;
}

/**
 * After removing `removedStoreIndex`, the store index of the next image (if any).
 * Indices after the removed row shift down by one.
 *
 * @param {Object[]|undefined|null} reduxItems Snapshot before removal.
 * @param {number}                  removedStoreIndex
 * @return {number|null}
 */
export function getNextImageStoreIndexAfterRemove(
	reduxItems,
	removedStoreIndex
) {
	if (!Array.isArray(reduxItems)) {
		return null;
	}
	const removed = Number(removedStoreIndex);
	if (!Number.isFinite(removed) || removed < 0) {
		return null;
	}
	for (let i = removed + 1; i < reduxItems.length; i++) {
		if (getGalleryItemEditKind(reduxItems[i]) === 'image') {
			return i - 1;
		}
	}
	return null;
}
