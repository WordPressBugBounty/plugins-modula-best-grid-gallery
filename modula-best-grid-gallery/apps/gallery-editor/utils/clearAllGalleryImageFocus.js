/**
 * Clear focal point + crop on every gallery image (REST), then sync Redux preview.
 */

import {
	asGalleryItemList,
	findStoreIndexForItemId,
	modulaImagesRowIndexForPreviewWrite,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { galleryPatchImageByIndex } from '../api/galleryUploadApi';
import {
	commitPreviewCatalog,
	mergeModulaRowIntoPreviewItem,
	stripFocalDataAttributesFromPreviewItem,
} from './previewItemsCommit';
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
		// ignore
	}
}

/**
 * @param {{ galleryId: number, store: import('@reduxjs/toolkit').Store }} args
 * @return {Promise<void>}
 */
export async function clearAllGalleryImageFocus({ galleryId, store }) {
	if (!galleryId || !store) {
		return;
	}
	const core = asGalleryItemList(store.getState().items.items);
	const ids = [];
	for (const row of core) {
		if (
			itemHasImageFocusData(row) &&
			row.id !== undefined &&
			row.id !== null
		) {
			ids.push(row.id);
		}
	}
	for (const id of ids) {
		const itemsNow = store.getState().items.items;
		const storeIndex = findStoreIndexForItemId(itemsNow, id);
		if (storeIndex < 0) {
			continue;
		}
		const restRowIndex = modulaImagesRowIndexForPreviewWrite(
			itemsNow,
			storeIndex
		);
		const displayCoreIndex = storeIndexToCoreIndex(itemsNow, storeIndex);
		if (restRowIndex < 0 || displayCoreIndex < 0) {
			continue;
		}
		const res = await galleryPatchImageByIndex(
			galleryId,
			restRowIndex,
			CLEAR_FIELDS
		);
		const patchRow = res?.image;
		if (!patchRow) {
			throw new Error(
				'Could not clear image focus (empty server response).'
			);
		}
		const nextCore = asGalleryItemList(store.getState().items.items);

		const prevItem = nextCore[displayCoreIndex];
		if (!prevItem) {
			continue;
		}
		nextCore[displayCoreIndex] = stripFocalDataAttributesFromPreviewItem(
			mergeModulaRowIntoPreviewItem(prevItem, patchRow)
		);
		commitPreviewCatalog(store, nextCore);
		clearFocusCropSessionForItem(galleryId, prevItem);
	}
}
