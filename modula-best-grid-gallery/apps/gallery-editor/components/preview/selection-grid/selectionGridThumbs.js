/**
 * Selection mode thumbnails: one per selectable image (the rows multi-select
 * can pick), in gallery order, keyed by store index for editor-shell's
 * `SelectionGrid`.
 */
import { __, sprintf } from '@wordpress/i18n';
import { getGalleryItemEditKind } from '../../../utils/galleryItemEditNavigation';
import { captionToPlainString } from '../../../utils/captionToPlainString';

/**
 * @typedef {import('editor-shell/canvas/SelectionGrid').SelectionGridThumb} SelectionGridThumb
 */

/**
 * @param {Object} row
 * @return {string} Smallest image URL the row carries.
 */
function thumbSource(row) {
	for (const key of ['thumbnail', 'src', 'url']) {
		if (typeof row[key] === 'string' && row[key] !== '') {
			return row[key];
		}
	}
	return '';
}

/**
 * @param {Object[]|undefined|null} items Preview store rows.
 * @return {SelectionGridThumb[]} Thumbnails for the selection grid.
 */
export function buildSelectionGridThumbs(items) {
	if (!Array.isArray(items)) {
		return [];
	}
	const thumbs = [];
	items.forEach((row, storeIndex) => {
		if (getGalleryItemEditKind(row) !== 'image') {
			return;
		}
		const title = captionToPlainString(row.title).trim();
		const alt = typeof row.alt === 'string' ? row.alt.trim() : '';
		thumbs.push({
			key: storeIndex,
			src: thumbSource(row),
			name:
				title ||
				alt ||
				sprintf(
					/* translators: %d: position of the image in the gallery */
					__('Image %d', 'modula-best-grid-gallery'),
					thumbs.length + 1
				),
		});
	});
	return thumbs;
}
