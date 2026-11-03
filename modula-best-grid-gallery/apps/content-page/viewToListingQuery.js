/**
 * Listing view ↔ GET modula/v2/listing query args.
 */

import { CONTENT_SECTION_ALL, LIST_SECTIONS } from './contentSections';
import {
	LISTING_SEGMENT_DEFAULT,
	getListingColumnFilters,
	getListingSegment,
} from './listingToolbarView';

/**
 * @typedef {Object} ListingView
 * @property {string}                                     [search]
 * @property {number}                                     [page]
 * @property {number}                                     [perPage]
 * @property {{ field: string, direction: 'asc'|'desc' }} [sort]
 * @property {string}                                     [segment]       Status segment: all, publish, draft or trash.
 * @property {{ type?: string[], status?: string[] }}     [columnFilters] Type keys and statuses checked in the column filters.
 * @property {string}                                     [section]       Content section listed (all, galleries, albums, proofing).
 */

/**
 * Default view for the content page list.
 *
 * @type {ListingView}
 */
export const DEFAULT_LISTING_VIEW = {
	search: '',
	page: 1,
	perPage: 20,
	sort: { field: 'updated', direction: 'desc' },
	segment: LISTING_SEGMENT_DEFAULT,
	columnFilters: { type: [], status: [] },
	section: CONTENT_SECTION_ALL,
};

/**
 * Map a view sort field id to WP orderby.
 *
 * @param {string} field
 * @return {string} The orderby; an unknown field sorts by modified date.
 */
function sortFieldToOrderby(field) {
	if (field === 'updated' || field === 'modified') {
		return 'modified';
	}
	if (field === 'title' || field === 'gallery') {
		return 'title';
	}
	if (field === 'date' || field === 'created') {
		return 'date';
	}
	return 'modified';
}

/**
 * The REST `status`: the segment, or the statuses the Status column filter
 * narrows All to.
 *
 * @param {ListingView} view
 * @return {string} `all`, one status, or a comma list.
 */
function statusArg(view) {
	const { status } = getListingColumnFilters(view);
	return status.length > 0 ? status.join(',') : getListingSegment(view);
}

/**
 * Map a listing view to listing REST query args.
 *
 * @param {ListingView} view
 * @return {Record<string, string|number>} GET /listing query args.
 */
export function viewToListingQuery(view) {
	const page = Number(view.page) > 0 ? Number(view.page) : 1;
	const perPage = Number(view.perPage) > 0 ? Number(view.perPage) : 20;
	const sort = view.sort || DEFAULT_LISTING_VIEW.sort;

	/** @type {Record<string, string|number>} */
	const query = {
		page,
		per_page: perPage,
		orderby: sortFieldToOrderby(sort.field),
		order: sort.direction === 'asc' ? 'asc' : 'desc',
		status: statusArg(view),
	};

	const search = typeof view.search === 'string' ? view.search.trim() : '';
	if (search) {
		query.search = search;
	}

	if (
		view.section !== CONTENT_SECTION_ALL &&
		LIST_SECTIONS.includes(view.section)
	) {
		query.section = view.section;
	}

	const { type } = getListingColumnFilters(view);
	if (type.length > 0) {
		// The route's array param also takes a comma list.
		query.productType = type.join(',');
	}

	return query;
}
