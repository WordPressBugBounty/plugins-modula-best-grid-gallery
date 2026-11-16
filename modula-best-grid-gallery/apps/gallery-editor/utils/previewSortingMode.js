/**
 * The gallery's working sort mode lives in the preview store's gallery
 * metadata (`gallerySorting`, opened from the bootstrap). Choosing a mode
 * changes it there; the editor save stores it (ADR 0059).
 *
 * @package
 */
import { setPreviewGalleryMetadata } from 'gallery-shared/preview';
import { isGallerySortMode } from './gallerySortingApply';

/**
 * @param {import('@reduxjs/toolkit').Store|null|undefined} store Preview store.
 * @return {string} The working sort mode; `manual` when none is known.
 */
export function readPreviewSortingMode(store) {
	const mode = store?.getState()?.gallery?.metadata?.gallerySorting;
	return isGallerySortMode(mode) ? mode : 'manual';
}

/**
 * @param {import('@reduxjs/toolkit').Store} store Preview store.
 * @param {string}                           mode  A valid sort mode.
 */
export function setPreviewSortingMode(store, mode) {
	if (!isGallerySortMode(mode) || readPreviewSortingMode(store) === mode) {
		return;
	}
	setPreviewGalleryMetadata(store, { gallerySorting: mode });
}
