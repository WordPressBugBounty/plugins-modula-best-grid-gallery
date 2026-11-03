/**
 * Keep per-image filter tags aligned with the gallery-level filter name list
 * (editor-shell's rules, shared with the Albums editor's members).
 */
import {
	filterListNames,
	stripFilterTags,
	stripOrphanFilterTags,
} from 'editor-shell/logic';
import { isEmbeddedGalleryItemRow } from './embeddedGalleryItems';

/**
 * Embedded rows (content blocks, shortcodes) carry no filter tags.
 *
 * @param {Object} row
 * @return {boolean} Whether the row is an image that carries tags.
 */
function isImageRow(row) {
	return !isEmbeddedGalleryItemRow(row);
}

export { filterListNames as normalizeGalleryFilterNames };

/**
 * Remove specific filter tags from every image row.
 *
 * @param {Object[]} coreItems
 * @param {string[]} removedNames
 * @return {{ items: Object[], changed: boolean }} The rows, new where a tag left.
 */
export function stripRemovedImageFiltersFromCoreItems(coreItems, removedNames) {
	return stripFilterTags(coreItems, removedNames, isImageRow);
}

/**
 * Remove image tags that no longer exist in the gallery filter list. An
 * empty gallery list strips nothing (wiped-list repair path).
 *
 * @param {Object[]} coreItems          Preview catalog (gallery items).
 * @param {string[]} galleryFilterNames Active gallery filter labels.
 * @return {{ items: Object[], changed: boolean }} The rows, new where a tag left.
 */
export function stripOrphanedImageFiltersFromCoreItems(
	coreItems,
	galleryFilterNames
) {
	return stripOrphanFilterTags(coreItems, galleryFilterNames, isImageRow);
}
