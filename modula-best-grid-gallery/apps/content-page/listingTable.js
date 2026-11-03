/**
 * Content table copy and options: status labels, the column filters'
 * options, the empty message and the footer noun.
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { LISTING_COLUMN_FILTER_STATUSES } from './listingToolbarView';

/**
 * @typedef {Object} ListingProductType
 * @property {string} key   `gallery:<type>` or `album:<type>`.
 * @property {string} label Product name.
 * @property {number} count Rows of that type for the section, search and status.
 */

export const LISTING_STATUS_LABELS = {
	publish: __('Published', 'modula-best-grid-gallery'),
	future: __('Scheduled', 'modula-best-grid-gallery'),
	draft: __('Draft', 'modula-best-grid-gallery'),
	pending: __('Pending', 'modula-best-grid-gallery'),
	private: __('Private', 'modula-best-grid-gallery'),
	trash: __('Trash', 'modula-best-grid-gallery'),
};

/**
 * @param {string} status
 * @return {string} The status label; an unknown status shows as stored.
 */
export function getListingStatusLabel(status) {
	return LISTING_STATUS_LABELS[status] || status;
}

/**
 * Type filter options: the types present in the current view, then any
 * checked type that no longer is, so it can still be unchecked.
 *
 * @param {ListingProductType[]|null|undefined} productTypes From GET /listing.
 * @param {string[]}                            checked      Checked keys.
 * @return {{ value: string, label: string, count?: number }[]} Options.
 */
export function getListingTypeFilterOptions(productTypes, checked) {
	const options = (Array.isArray(productTypes) ? productTypes : [])
		.filter((type) => typeof type?.key === 'string' && type.key !== '')
		.map((type) => ({
			value: type.key,
			label: String(type.label || type.key),
			count: Number(type.count) || 0,
		}));
	const present = new Set(options.map((option) => option.value));
	const missing = checked
		.filter((key) => !present.has(key))
		.map((key) => ({ value: key, label: key.split(':').pop() || key }));
	return [...options, ...missing];
}

/**
 * @return {{ value: string, label: string }[]} The Status column filter's options.
 */
export function getListingStatusFilterOptions() {
	return LISTING_COLUMN_FILTER_STATUSES.map((status) => ({
		value: status,
		label: getListingStatusLabel(status),
	}));
}

/**
 * The footer and empty message noun for a content section's rows.
 *
 * @param {string}  section   Content section.
 * @param {boolean} hasAlbums Whether albums can be listed.
 * @return {(count: number) => string} The noun for a count.
 */
export function getListingRowNoun(section, hasAlbums) {
	if (section === 'albums') {
		return (count) =>
			_n('album', 'albums', count, 'modula-best-grid-gallery');
	}
	if (section === 'all' && hasAlbums) {
		return (count) =>
			_n('item', 'items', count, 'modula-best-grid-gallery');
	}
	return (count) =>
		_n('gallery', 'galleries', count, 'modula-best-grid-gallery');
}

/**
 * What the table says with no rows to show (the page has rows elsewhere).
 *
 * @param {{ segment: string, search: string, noun: string }} options The view's segment and search, and the plural noun.
 * @return {string} The empty message.
 */
export function getListingEmptyMessage({ segment, search, noun }) {
	if (search) {
		return sprintf(
			/* translators: 1: plural noun (galleries, albums, items), 2: search text. */
			__('No %1$s match “%2$s”', 'modula-best-grid-gallery'),
			noun,
			search
		);
	}
	if (segment === 'trash') {
		return __('Trash is empty', 'modula-best-grid-gallery');
	}
	return sprintf(
		/* translators: %s: plural noun (galleries, albums, items). */
		__('No %s here', 'modula-best-grid-gallery'),
		noun
	);
}
