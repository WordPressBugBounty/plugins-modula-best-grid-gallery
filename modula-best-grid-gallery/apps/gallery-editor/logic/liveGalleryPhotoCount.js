/**
 * Photos on the live canvas, for settings that only matter at a given count
 * (form-rules `{ "fact": "galleryPhotoCount" }`). Counts the same rows the
 * Showcase strip renders: embedded content blocks and shortcodes are not photos.
 * Imports the kinds module, not the `gallery-shared/preview` barrel, so field
 * visibility stays free of the preview runtime.
 */
import { isEmbeddedGalleryItemRow } from 'gallery-shared/utils/embeddedGalleryItemKinds';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';

/**
 * @param {unknown} items Preview `items.items`.
 * @return {number} Photos among the rows.
 */
export function countGalleryPhotos(items) {
	if (!Array.isArray(items)) {
		return 0;
	}
	return items.filter((row) => row && !isEmbeddedGalleryItemRow(row)).length;
}

/**
 * Reads the preview store directly so field visibility needs no extra
 * argument; components that show such fields re-render on item changes
 * through `useLiveGalleryPhotoCount`.
 *
 * @return {number|null} Photos on the canvas, or null before the preview store registers.
 */
export function getLiveGalleryPhotoCount() {
	const store = getGalleryPreviewReduxStore();
	if (!store) {
		return null;
	}
	return countGalleryPhotos(store.getState().items?.items);
}
