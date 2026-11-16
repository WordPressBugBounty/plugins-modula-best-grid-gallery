/**
 * Clear the focal point and crop of every gallery image in the preview store.
 * Nothing is sent: the editor save stores it with the items (ADR 0059).
 */

import {
	asGalleryItemList,
	commitPreviewCatalog,
} from 'gallery-shared/preview';
import { stripFocalDataAttributesFromPreviewItem } from './previewItemsCommit';
import { itemHasImageFocusData } from './itemHasImageFocus';

const CLEAR_FIELDS = {
	focal_x: '',
	focal_y: '',
	focal_crop_x: '',
	focal_crop_y: '',
	focal_crop_w: '',
	focal_crop_h: '',
	tile_image_fit: '',
};

function clearFocusCropSessionForItem(galleryId, item) {
	if (typeof sessionStorage === 'undefined' || !galleryId || !item?.id) {
		return;
	}
	try {
		sessionStorage.removeItem(
			`modula-focus-crop-area:v1:${galleryId}:${String(item.id)}`
		);
	} catch {
		// The crop area kept for the focus dialog is a convenience only.
	}
}

/**
 * @param {{
 *   galleryId: number,
 *   store: import('@reduxjs/toolkit').Store,
 *   commitCatalog?: (catalog: Object[]) => void,
 * }} args `commitCatalog` writes the cleared catalog; the store's catalog by default.
 * @return {boolean} True when an image had focus data.
 */
export function clearAllGalleryImageFocus({
	galleryId,
	store,
	commitCatalog = (catalog) => commitPreviewCatalog(store, catalog),
}) {
	if (!store) {
		return false;
	}
	const core = asGalleryItemList(store.getState().items.items);
	const cleared = core.filter(
		(row) =>
			itemHasImageFocusData(row) &&
			row.id !== undefined &&
			row.id !== null
	);
	if (cleared.length === 0) {
		return false;
	}
	commitCatalog(
		core.map((row) =>
			cleared.includes(row)
				? stripFocalDataAttributesFromPreviewItem({
						...row,
						...CLEAR_FIELDS,
					})
				: row
		)
	);
	cleared.forEach((row) => clearFocusCropSessionForItem(galleryId, row));
	return true;
}
