/**
 * Listing view rules behind the toolbar and the column filters: status
 * segments, the Status and Type column filters, sort and search.
 */

/** @typedef {import('./viewToListingQuery').ListingView} ListingView */
/** @typedef {'all'|'publish'|'draft'|'trash'} ListingSegment */
/** @typedef {'newest'|'oldest'|'az'} ListingSortValue */

/** Status segments, in toolbar order. All is every status except trash. */
export const LISTING_SEGMENTS = ['all', 'publish', 'draft', 'trash'];

/** @type {ListingSegment} */
export const LISTING_SEGMENT_DEFAULT = 'all';

/** Statuses the All segment lists (the REST `status=all`). */
export const LISTING_LIVE_STATUSES = [
	'publish',
	'draft',
	'private',
	'pending',
	'future',
];

/** Every status a listing row can have, for the counts that decide the empty state. */
export const LISTING_STATUS_FILTER_VALUES = [
	'publish',
	'future',
	'draft',
	'private',
	'trash',
];

/** What the Status column filter can pick; it narrows the All segment. */
export const LISTING_COLUMN_FILTER_STATUSES = ['publish', 'draft', 'private'];

export const LISTING_SORT_NEWEST = 'newest';
export const LISTING_SORT_OLDEST = 'oldest';
export const LISTING_SORT_AZ = 'az';

/** Sort menu values, in menu order, and the view sort each one stores. */
const LISTING_SORTS = {
	[LISTING_SORT_NEWEST]: { field: 'updated', direction: 'desc' },
	[LISTING_SORT_OLDEST]: { field: 'updated', direction: 'asc' },
	[LISTING_SORT_AZ]: { field: 'title', direction: 'asc' },
};

/** Sort fields that mean the title (A–Z). */
const TITLE_SORT_FIELDS = ['title', 'gallery'];

/**
 * @param {unknown}  values
 * @param {string[]} allowed
 * @return {string[]} The allowed strings, once each, in their order.
 */
function pickAllowed(values, allowed) {
	if (!Array.isArray(values)) {
		return [];
	}
	return values.filter(
		(value, index) =>
			allowed.includes(value) && values.indexOf(value) === index
	);
}

/**
 * @param {unknown} values
 * @return {string[]} Non-empty product type keys, once each.
 */
function pickTypeKeys(values) {
	if (!Array.isArray(values)) {
		return [];
	}
	return values.filter(
		(key, index) =>
			typeof key === 'string' &&
			key !== '' &&
			values.indexOf(key) === index
	);
}

/**
 * @param {ListingView} view
 * @return {ListingSegment} The view's segment, All when missing or unknown.
 */
export function getListingSegment(view) {
	return LISTING_SEGMENTS.includes(view?.segment)
		? view.segment
		: LISTING_SEGMENT_DEFAULT;
}

/**
 * Choosing a segment clears the Status column filter: it only narrows All.
 *
 * @param {ListingView}    view
 * @param {ListingSegment} segment
 * @return {ListingView} The view on page 1 of that segment.
 */
export function applyListingSegment(view, segment) {
	return {
		...view,
		page: 1,
		segment: LISTING_SEGMENTS.includes(segment)
			? segment
			: LISTING_SEGMENT_DEFAULT,
		columnFilters: { ...getListingColumnFilters(view), status: [] },
	};
}

/**
 * The Status column filter has a choice to make only on All; Published and
 * Drafts hold one status and Trash none it can pick.
 *
 * @param {ListingView} view
 * @return {boolean} Whether the Status head is a column filter.
 */
export function isListingStatusFilterAvailable(view) {
	return getListingSegment(view) === LISTING_SEGMENT_DEFAULT;
}

/**
 * @param {ListingView} view
 * @return {{ type: string[], status: string[] }} Valid column filter values; status only while it applies.
 */
export function getListingColumnFilters(view) {
	const filters =
		view?.columnFilters && typeof view.columnFilters === 'object'
			? view.columnFilters
			: {};
	const status = isListingStatusFilterAvailable(view)
		? pickAllowed(filters.status, LISTING_COLUMN_FILTER_STATUSES)
		: [];
	return { type: pickTypeKeys(filters.type), status };
}

/**
 * @param {ListingView} view
 * @param {string[]}    statuses Checked statuses; empty clears.
 * @return {ListingView} The view on page 1.
 */
export function applyListingStatusFilter(view, statuses) {
	return {
		...view,
		page: 1,
		columnFilters: {
			...getListingColumnFilters(view),
			status: pickAllowed(statuses, LISTING_COLUMN_FILTER_STATUSES),
		},
	};
}

/**
 * @param {ListingView} view
 * @param {string[]}    keys Product type keys (`gallery:<type>`, `album:<type>`); empty clears.
 * @return {ListingView} The view on page 1.
 */
export function applyListingTypeFilter(view, keys) {
	return {
		...view,
		page: 1,
		columnFilters: {
			...getListingColumnFilters(view),
			type: pickTypeKeys(keys),
		},
	};
}

/**
 * Statuses the view lists: the segment's, narrowed by the Status column filter.
 *
 * @param {ListingView} view
 * @return {string[]} Post statuses.
 */
export function getListingViewStatuses(view) {
	const segment = getListingSegment(view);
	if (segment !== LISTING_SEGMENT_DEFAULT) {
		return [segment];
	}
	const { status } = getListingColumnFilters(view);
	return status.length > 0 ? status : LISTING_LIVE_STATUSES;
}

/**
 * @param {ListingView} view
 * @return {ListingSortValue} The Sort menu value for the view's sort.
 */
export function getListingSortValue(view) {
	const sort = view?.sort || LISTING_SORTS[LISTING_SORT_NEWEST];
	if (TITLE_SORT_FIELDS.includes(sort.field)) {
		return LISTING_SORT_AZ;
	}
	return sort.direction === 'asc' ? LISTING_SORT_OLDEST : LISTING_SORT_NEWEST;
}

/**
 * @param {ListingView}      view
 * @param {ListingSortValue} sortValue Unknown values sort newest first.
 * @return {ListingView} The view on page 1.
 */
export function applyListingSort(view, sortValue) {
	return {
		...view,
		page: 1,
		sort: {
			...(LISTING_SORTS[sortValue] || LISTING_SORTS[LISTING_SORT_NEWEST]),
		},
	};
}

/**
 * @param {ListingView} view
 * @return {string} The search without surrounding spaces.
 */
export function getActiveListingSearch(view) {
	return typeof view.search === 'string' ? view.search.trim() : '';
}

/**
 * @param {ListingView} view
 * @return {ListingView} The view without search, on page 1.
 */
export function clearListingSearch(view) {
	return {
		...view,
		page: 1,
		search: '',
	};
}
