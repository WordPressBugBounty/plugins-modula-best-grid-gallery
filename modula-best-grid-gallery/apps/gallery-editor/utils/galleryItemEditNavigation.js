/**
 * Prev/next navigation helpers for the unified gallery item edit modal.
 */
import { getItemEditPager } from 'editor-shell/logic';
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
 * @typedef {Object} GalleryItemEditPager
 * @property {number}      position      1-based place among the editable items.
 * @property {number}      total         Editable items in the gallery.
 * @property {number|null} previousIndex Store index of the previous item; wraps to the last. Null when the item is alone.
 * @property {number|null} nextIndex     Store index of the next item; wraps to the first. Null when the item is alone.
 * @property {boolean}     onlyImages    No content block is counted, so the place can read "Image X of N".
 */

/**
 * "Image X of N" and the previous/next items of the item edit panel, in
 * gallery order over images and content blocks (as the canvas does).
 *
 * @param {Object[]|undefined|null} reduxItems
 * @param {number}                  storeIndex Item open in the panel.
 * @return {GalleryItemEditPager|null} Null when `storeIndex` is not an editable item.
 */
export function getGalleryItemEditPager(reduxItems, storeIndex) {
	const indices = getEditableGalleryItemIndices(reduxItems);
	const pager = getItemEditPager(indices, storeIndex);
	if (!pager) {
		return null;
	}
	return {
		position: pager.position,
		total: pager.total,
		previousIndex: pager.previous,
		nextIndex: pager.next,
		onlyImages: indices.every(
			(index) => getGalleryItemEditKind(reduxItems[index]) === 'image'
		),
	};
}

/**
 * After removing `removedStoreIndex`, the store index of the next image (if any).
 * Indices after the removed row shift down by one.
 *
 * @param {Object[]|undefined|null} reduxItems        Snapshot before removal.
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
