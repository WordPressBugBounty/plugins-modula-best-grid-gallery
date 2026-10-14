/**
 * Whether the takeover canvas has something to paint.
 * Content blocks and shortcodes are gallery content even when no photo is attached.
 */
import {
	isEmbeddedGalleryItemRow,
	isVideoGalleryItem,
} from 'gallery-shared/preview';

/**
 * @param {unknown[]} items       Bootstrap gallery rows.
 * @param {string}    galleryType Current gallery type.
 * @return {boolean} True when the canvas should show the gallery instead of the empty drop state.
 */
export function galleryHasPreviewContent(items, galleryType = '') {
	if (!Array.isArray(items)) {
		return false;
	}
	if (galleryType === 'video') {
		return items.some((row) => isVideoGalleryItem(row));
	}
	return items.some((row) => {
		if (!row || typeof row !== 'object') {
			return false;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			return true;
		}
		return Boolean(
			(typeof row.src === 'string' && row.src) ||
				(typeof row.thumbnail === 'string' && row.thumbnail) ||
				(typeof row.url === 'string' && row.url)
		);
	});
}
