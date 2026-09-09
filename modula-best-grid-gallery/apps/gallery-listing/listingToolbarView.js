/**
 * Listing toolbar ↔ DataViews view helpers (status, sort, search summary).
 */

/** @typedef {import('./viewToListingQuery').ListingView} ListingView */

export const LISTING_STATUS_ALL = 'all';

/** @type {readonly ['publish', 'draft', 'private', 'trash']} */
export const LISTING_STATUS_FILTER_VALUES = [
	'publish',
	'draft',
	'private',
	'trash',
];

export const LISTING_SORT_NEWEST = 'updated-desc';
export const LISTING_SORT_OLDEST = 'updated-asc';

/** @type {readonly ['hasProofing', 'hasPassword', 'hasVideos']} */
export const LISTING_ONLY_SHOW_TOGGLE_FIELDS = [
	'hasProofing',
	'hasPassword',
	'hasVideos',
];

/** @type {readonly ['rowType', 'hasProofing', 'hasPassword', 'hasVideos']} */
export const LISTING_ONLY_SHOW_FIELDS = [
	'rowType',
	...LISTING_ONLY_SHOW_TOGGLE_FIELDS,
];

/**
 * Only show checkbox fields for the current listing bootstrap.
 *
 * @param {{ hasAlbums?: boolean, isPro?: boolean }} [options]
 * @return {string[]}
 */
export function getListingOnlyShowFields({
	hasAlbums = false,
	isPro = false,
} = {}) {
	/** @type {string[]} */
	const fields = [];
	if (hasAlbums) {
		fields.push('rowType');
	}
	if (isPro) {
		fields.push(...LISTING_ONLY_SHOW_TOGGLE_FIELDS);
	}
	return fields;
}

/**
 * Drop Only show filters the current site cannot offer (Lite paywalled, or no albums).
 *
 * @param {ListingView} view
 * @param {{ hasAlbums?: boolean, isPro?: boolean }} [options]
 * @return {ListingView}
 */
export function sanitizeListingOnlyShowFilters(view, options = {}) {
	const allowed = new Set(getListingOnlyShowFields(options));
	const filters = (Array.isArray(view?.filters) ? view.filters : []).filter(
		(filter) => {
			if (!filter || typeof filter !== 'object') {
				return false;
			}
			if (!LISTING_ONLY_SHOW_FIELDS.includes(filter.field)) {
				return true;
			}
			return allowed.has(filter.field);
		}
	);

	return {
		...view,
		filters,
	};
}

const EVERYTHING_STATUSES = ['publish', 'draft', 'private'];

/**
 * @param {ListingView} view
 * @return {string}
 */
export function getListingStatusValue(view) {
	const filters = Array.isArray(view.filters) ? view.filters : [];
	const statusFilter = filters.find((filter) => filter.field === 'status');
	if (!statusFilter || statusFilter.value == null) {
		return LISTING_STATUS_ALL;
	}

	const values = Array.isArray(statusFilter.value)
		? statusFilter.value
		: [statusFilter.value];

	if (values.length === 0) {
		return LISTING_STATUS_ALL;
	}

	if (
		values.length >= EVERYTHING_STATUSES.length &&
		EVERYTHING_STATUSES.every((status) => values.includes(status)) &&
		!values.includes('trash')
	) {
		return LISTING_STATUS_ALL;
	}

	if (values.length === 1 && typeof values[0] === 'string') {
		return values[0];
	}

	return LISTING_STATUS_ALL;
}

/**
 * @param {ListingView} view
 * @param {string} statusValue
 * @return {ListingView}
 */
export function applyListingStatusFilter(view, statusValue) {
	const otherFilters = (Array.isArray(view.filters) ? view.filters : []).filter(
		(filter) => filter.field !== 'status'
	);

	if (statusValue === LISTING_STATUS_ALL || !statusValue) {
		return {
			...view,
			page: 1,
			filters: otherFilters,
		};
	}

	return {
		...view,
		page: 1,
		filters: [
			...otherFilters,
			{
				field: 'status',
				operator: 'isAny',
				value: [statusValue],
			},
		],
	};
}

/**
 * @param {ListingView} view
 * @return {string}
 */
export function getListingSortValue(view) {
	const sort = view.sort || { field: 'updated', direction: 'desc' };
	if (sort.field === 'updated' && sort.direction === 'asc') {
		return LISTING_SORT_OLDEST;
	}
	return LISTING_SORT_NEWEST;
}

/**
 * @param {ListingView} view
 * @param {string} sortValue
 * @return {ListingView}
 */
export function applyListingSort(view, sortValue) {
	if (sortValue === LISTING_SORT_OLDEST) {
		return {
			...view,
			page: 1,
			sort: { field: 'updated', direction: 'asc' },
		};
	}

	return {
		...view,
		page: 1,
		sort: { field: 'updated', direction: 'desc' },
	};
}

/**
 * @param {ListingView} view
 * @return {string}
 */
export function getActiveListingSearch(view) {
	return typeof view.search === 'string' ? view.search.trim() : '';
}

/**
 * @param {ListingView} view
 * @return {ListingView}
 */
export function clearListingSearch(view) {
	return {
		...view,
		page: 1,
		search: '',
	};
}

/**
 * Whether the search-results summary row should show.
 *
 * @param {ListingView} view
 * @return {boolean}
 */
export function shouldShowListingSearchSummary(view) {
	return getActiveListingSearch(view) !== '';
}

/**
 * Toolbar trigger label for the status filter (not menu copy).
 *
 * @param {string} statusValue
 * @return {string}
 */
export function getListingStatusTriggerLabel(statusValue) {
	switch (statusValue) {
		case 'publish':
			return 'Published';
		case 'draft':
			return 'Drafts';
		case 'private':
			return 'Private';
		case 'trash':
			return 'In the trash';
		case LISTING_STATUS_ALL:
		default:
			return 'All statuses';
	}
}

/**
 * @param {ListingView} view
 * @param {string} field
 * @return {boolean}
 */
export function isListingOnlyShowFilterActive(view, field) {
	const filters = Array.isArray(view.filters) ? view.filters : [];
	const match = filters.find((filter) => filter.field === field);
	if (!match || match.value == null) {
		return false;
	}
	if (field === 'rowType') {
		const value = Array.isArray(match.value) ? match.value[0] : match.value;
		return value === 'album';
	}
	const value = Array.isArray(match.value) ? match.value[0] : match.value;
	return value === '1' || value === 1 || value === true || value === 'true';
}

/**
 * @param {ListingView} view
 * @param {string} field
 * @param {boolean} active
 * @return {ListingView}
 */
export function setListingOnlyShowFilter(view, field, active) {
	const otherFilters = (Array.isArray(view.filters) ? view.filters : []).filter(
		(filter) => filter.field !== field
	);

	if (!active) {
		return {
			...view,
			page: 1,
			filters: otherFilters,
		};
	}

	if (field === 'rowType') {
		return {
			...view,
			page: 1,
			filters: [
				...otherFilters,
				{ field: 'rowType', operator: 'is', value: 'album' },
			],
		};
	}

	return {
		...view,
		page: 1,
		filters: [...otherFilters, { field, operator: 'is', value: '1' }],
	};
}
