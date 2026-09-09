/**
 * Sync Redux `items` + `originalItems` after core list changes.
 *
 * The preview catalog is gallery items only. Preview page dividers are painted
 * at render from previewCatalogPages, not stored as fake rows.
 *
 * @package
 */

import { asGalleryItemList } from './galleryItemIdentity';
import { setItems, setOriginalItems } from '../store/slices/itemsSlice';
import { applyVideoPosterFieldsToPreviewItem } from '../video/videoGalleryModel';

/**
 * @param {import('@reduxjs/toolkit').Store} store     Gallery Redux store.
 * @param {Object[]}                         coreItems Preview catalog (gallery items).
 * @return {void} Nothing.
 */
export function applyCoreItemsToPreviewStore(store, coreItems) {
	const catalog = asGalleryItemList(coreItems).map((row) =>
		applyVideoPosterFieldsToPreviewItem(row)
	);
	store.dispatch(setItems(catalog));
	store.dispatch(setOriginalItems([...catalog]));
}
