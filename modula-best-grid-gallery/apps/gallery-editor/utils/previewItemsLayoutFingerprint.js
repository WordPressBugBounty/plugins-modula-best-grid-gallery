import {
	getItemVideoUrl,
	isEmbeddedGalleryItemRow,
} from 'gallery-shared/preview';
import { isVideoTemplateRow } from './videoTemplateItems';

/**
 * Short stable signature for embedded row body fields (content block / shortcode).
 *
 * @param {Object} row
 * @return {string}
 */
function embeddedRowContentSignature(row) {
	if (!isEmbeddedGalleryItemRow(row)) {
		return '';
	}
	const body = String(row.blockBodyHtml || '');
	const raw = String(row.shortcodeRaw || '');
	const title = String(row.title || '');
	const description = String(row.description || '');
	return [body.length, body, raw.length, raw, title, description].join('~');
}

/**
 * Media URL signature so attachment file changes (watermark, replace) hydrate preview.
 *
 * @param {Object} row
 * @return {string}
 */
function rowMediaSignature(row) {
	if (!row || typeof row !== 'object') {
		return '';
	}
	const attrs =
		(row.imgAttributes && typeof row.imgAttributes === 'object'
			? row.imgAttributes
			: null) ||
		(row.img_attributes && typeof row.img_attributes === 'object'
			? row.img_attributes
			: null) ||
		{};
	return [
		row.src ?? '',
		row.url ?? '',
		row.image_full ?? '',
		row.thumbnail ?? '',
		row.srcset ?? '',
		attrs.src ?? '',
		attrs['data-src'] ?? '',
		attrs.srcset ?? '',
		attrs['data-srcset'] ?? '',
	].join('~');
}

/**
 * Stable fingerprint of preview item rows for layout persist race detection.
 *
 * Includes media URLs so server-side file swaps (e.g. watermark apply/remove)
 * replace preview store items instead of preserving stale srcs.
 *
 * @param {Object[]} coreItems Preview catalog (gallery items).
 * @return {string}
 */
export function previewItemsLayoutFingerprint(coreItems) {
	if (!Array.isArray(coreItems)) {
		return '';
	}
	return coreItems
		.map((row) => {
			if (!row || typeof row !== 'object') {
				return '';
			}
			const id = row.id ?? row.embeddedId ?? '';
			const videoThumb =
				isVideoTemplateRow(row) || getItemVideoUrl(row)
					? (row.video_thumbnail ?? '')
					: '';
			return [
				id,
				row.gridX ?? '',
				row.gridY ?? '',
				row.width ?? '',
				row.height ?? '',
				row.gridLocked ?? '',
				videoThumb,
				embeddedRowContentSignature(row),
				rowMediaSignature(row),
			].join(':');
		})
		.join('|');
}
