/**
 * Clear trash (listing) — toolbar visibility, confirm copy, and trash fetch.
 */

import { __, _n, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import {
	getListingStatusValue,
	LISTING_STATUS_ALL,
} from './listingToolbarView';

/**
 * Whether Clear trash belongs on the listing toolbar.
 *
 * @param {{ statusFilter?: string, trashCount?: number }} options
 * @return {boolean}
 */
export function shouldShowClearTrash({
	statusFilter = LISTING_STATUS_ALL,
	trashCount = 0,
} = {}) {
	return statusFilter === 'trash' && Number(trashCount) > 0;
}

/**
 * @param {import('./viewToListingQuery').ListingView} view
 * @param {{ trash?: number }|null|undefined} statusCounts
 * @return {boolean}
 */
export function shouldShowClearTrashForView(view, statusCounts) {
	return shouldShowClearTrash({
		statusFilter: getListingStatusValue(view),
		trashCount: statusCounts?.trash ?? 0,
	});
}

/**
 * Trash rows the current user can permanently delete.
 *
 * @param {Object[]|null|undefined} rows
 * @return {Object[]}
 */
export function filterDeletableTrashRows(rows) {
	if (!Array.isArray(rows)) {
		return [];
	}
	return rows.filter(
		(row) => row?.status === 'trash' && row?.canDelete === true
	);
}

/**
 * Load every trash listing row (galleries + albums), ignoring search / ONLY SHOW.
 *
 * @param {(options: { path: string }) => Promise<{
 *   rows?: Object[],
 *   pagination?: { pages?: number }
 * }>} fetchJson
 * @return {Promise<Object[]>}
 */
export async function fetchAllTrashListingRows(fetchJson) {
	const perPage = 100;
	let page = 1;
	let pages = 1;
	/** @type {Object[]} */
	const rows = [];

	while (page <= pages) {
		const data = await fetchJson({
			path: addQueryArgs('/modula/v2/listing', {
				status: 'trash',
				page,
				per_page: perPage,
				orderby: 'modified',
				order: 'desc',
			}),
		});
		if (Array.isArray(data?.rows)) {
			rows.push(...data.rows);
		}
		pages = Math.max(1, Number(data?.pagination?.pages) || 1);
		page += 1;
		if (page > 500) {
			break;
		}
	}

	return rows;
}

/**
 * @param {number} count
 * @return {string}
 */
export function getClearTrashConfirmMessage(count) {
	const n = Math.max(0, Number(count) || 0);
	return sprintf(
		/* translators: %d: number of galleries and albums to permanently delete */
		_n(
			'Permanently delete %d item from the trash? This cannot be undone.',
			'Permanently delete %d items from the trash? This cannot be undone.',
			n,
			'modula-best-grid-gallery'
		),
		n
	);
}

/**
 * @return {string}
 */
export function getClearTrashConfirmButtonLabel() {
	return __('Clear trash', 'modula-best-grid-gallery');
}
