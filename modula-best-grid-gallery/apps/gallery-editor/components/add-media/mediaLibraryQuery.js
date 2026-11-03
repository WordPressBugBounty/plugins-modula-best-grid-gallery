/**
 * Media library tab of the Add media dialog: the `GET /wp/v2/media` query
 * and the shapes it reads (months, attachment rows).
 */
import { decodeEntities } from '@wordpress/html-entities';
import { addQueryArgs } from '@wordpress/url';
import { filenameFromUrl } from '../../utils/imageMetadataPreviewMeta';

/** One REST page; "Load more" asks for the next one. */
export const MEDIA_LIBRARY_PAGE_SIZE = 40;

const MONTH_VALUE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/**
 * @param {number} n
 * @return {string} Two digits.
 */
function pad2(n) {
	return String(n).padStart(2, '0');
}

/**
 * REST `after` / `before` are exclusive, so the range runs from the last
 * second of the previous month to the first instant of the next one.
 *
 * @param {string} value `YYYY-MM`.
 * @return {{ after: string, before: string } | null} Null for anything else.
 */
export function mediaMonthRange(value) {
	const match = MONTH_VALUE.exec(String(value));
	if (!match) {
		return null;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	// Day 0 of a month is the last day of the month before it.
	const lastDayBefore = new Date(Date.UTC(year, month - 1, 0));
	const nextMonthStart = new Date(Date.UTC(year, month, 1));

	return {
		after: `${lastDayBefore.getUTCFullYear()}-${pad2(
			lastDayBefore.getUTCMonth() + 1
		)}-${pad2(lastDayBefore.getUTCDate())}T23:59:59`,
		before: `${nextMonthStart.getUTCFullYear()}-${pad2(
			nextMonthStart.getUTCMonth() + 1
		)}-01T00:00:00`,
	};
}

/**
 * @param {{
 *   page: number,
 *   search?: string,
 *   month?: string,
 * }} filters `month` is `YYYY-MM`.
 * @return {string} REST path for one page of images.
 */
export function buildMediaLibraryPath({ page, search = '', month = '' }) {
	/** @type {Record<string, string|number>} */
	const args = {
		media_type: 'image',
		per_page: MEDIA_LIBRARY_PAGE_SIZE,
		page,
		orderby: 'date',
		order: 'desc',
		_fields:
			'id,title,source_url,media_details.sizes.medium.source_url,media_details.sizes.thumbnail.source_url',
	};
	const term = search.trim();
	if (term !== '') {
		args.search = term;
	}
	const range = mediaMonthRange(month);
	if (range) {
		args.after = range.after;
		args.before = range.before;
	}

	return addQueryArgs('/wp/v2/media', args);
}

/**
 * The months that have media, as core's media modal lists them
 * (`wp.media.view.settings.months`).
 *
 * @param {{ months?: unknown }|undefined} mediaSettings
 * @return {{ value: string, label: string }[]} Newest first, as core sorts them.
 */
export function readMediaMonthOptions(mediaSettings) {
	const months = mediaSettings?.months;
	if (!Array.isArray(months)) {
		return [];
	}
	return months
		.map((row) => {
			const value = `${row?.year}-${pad2(row?.month)}`;
			return MONTH_VALUE.test(value)
				? { value, label: String(row.text ?? value) }
				: null;
		})
		.filter(Boolean);
}

/**
 * @typedef {{ id: number, name: string, thumbUrl: string, inGallery: boolean }} MediaLibraryItem
 */

/**
 * Tiles are named by file, as on the canvas; a row without a file URL falls
 * back to its title.
 *
 * @param {unknown}     row          One `/wp/v2/media` row.
 * @param {Set<number>} inGalleryIds Attachments the gallery already shows.
 * @return {MediaLibraryItem|null} Null for a row without a positive id.
 */
export function toMediaLibraryItem(row, inGalleryIds) {
	const id = Number(row?.id);
	if (!Number.isInteger(id) || id <= 0) {
		return null;
	}
	const sizes = row.media_details?.sizes ?? {};
	return {
		id,
		name:
			filenameFromUrl(row.source_url) ||
			decodeEntities(String(row.title?.rendered ?? '')),
		thumbUrl:
			sizes.medium?.source_url ||
			sizes.thumbnail?.source_url ||
			String(row.source_url ?? ''),
		inGallery: inGalleryIds.has(id),
	};
}
