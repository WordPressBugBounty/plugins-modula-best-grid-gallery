/**
 * DataViews view ↔ GET modula/v2/listing query args.
 */

/** @typedef {{ field: string, operator: string, value?: string|string[]|boolean }} ListingFilter */

/**
 * @typedef {Object} ListingView
 * @property {string} [type]
 * @property {string} [search]
 * @property {number} [page]
 * @property {number} [perPage]
 * @property {{ field: string, direction: 'asc'|'desc' }} [sort]
 * @property {ListingFilter[]} [filters]
 * @property {string[]} [fields]
 * @property {string} [titleField]
 * @property {string} [mediaField]
 * @property {Record<string, unknown>} [layout]
 */

/**
 * Default DataViews view for the gallery listing.
 *
 * @type {ListingView}
 */
export const DEFAULT_LISTING_VIEW = {
	type: 'table',
	search: '',
	page: 1,
	perPage: 20,
	sort: { field: 'updated', direction: 'desc' },
	filters: [],
	fields: ['items', 'shortcodes', 'status', 'updated'],
	titleField: 'gallery',
	mediaField: 'preview',
};

/** Status values that mean “everything” (non-trash library). */
const EVERYTHING_STATUSES = ['publish', 'draft', 'private'];

/**
 * Map a DataViews sort field id to WP orderby.
 *
 * @param {string} field
 * @return {string}
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
 * Resolve status query arg from DataViews filters.
 *
 * @param {ListingFilter[]} filters
 * @return {string|undefined}
 */
function statusFromFilters(filters) {
	const statusFilter = filters.find((f) => f.field === 'status');
	if (!statusFilter || statusFilter.value == null) {
		return undefined;
	}
	const values = Array.isArray(statusFilter.value)
		? statusFilter.value
		: [statusFilter.value];
	if (values.length === 0) {
		return undefined;
	}
	if (
		values.length >= EVERYTHING_STATUSES.length &&
		EVERYTHING_STATUSES.every((s) => values.includes(s)) &&
		!values.includes('trash')
	) {
		return undefined;
	}
	if (values.length === 1) {
		return values[0];
	}
	return values.join(',');
}

/**
 * @param {ListingFilter[]} filters
 * @param {string} field
 * @return {boolean|undefined}
 */
function isActiveOnlyShowFilter(filters, field) {
	const match = filters.find((f) => f.field === field);
	if (!match || match.value == null) {
		return undefined;
	}
	const value = Array.isArray(match.value) ? match.value[0] : match.value;
	return value === '1' || value === 1 || value === true || value === 'true';
}

/**
 * @param {ListingFilter[]} filters
 * @return {string|undefined}
 */
function rowTypeFromFilters(filters) {
	const match = filters.find((f) => f.field === 'rowType');
	if (!match || match.value == null) {
		return undefined;
	}
	const value = Array.isArray(match.value) ? match.value[0] : match.value;
	if (value === 'album' || value === 'gallery') {
		return value;
	}
	return undefined;
}

/**
 * Map a DataViews view to listing REST query args.
 *
 * @param {ListingView} view
 * @return {Record<string, string|number>}
 */
export function viewToListingQuery(view) {
	const page = Number(view.page) > 0 ? Number(view.page) : 1;
	const perPage = Number(view.perPage) > 0 ? Number(view.perPage) : 20;
	const sort = view.sort || DEFAULT_LISTING_VIEW.sort;
	const filters = Array.isArray(view.filters) ? view.filters : [];

	/** @type {Record<string, string|number>} */
	const query = {
		page,
		per_page: perPage,
		orderby: sortFieldToOrderby(sort.field),
		order: sort.direction === 'asc' ? 'asc' : 'desc',
	};

	const search = typeof view.search === 'string' ? view.search.trim() : '';
	if (search) {
		query.search = search;
	}

	const status = statusFromFilters(filters);
	if (status) {
		query.status = status;
	}

	const rowType = rowTypeFromFilters(filters);
	if (rowType) {
		query.type = rowType;
	}

	if (isActiveOnlyShowFilter(filters, 'hasProofing')) {
		query.hasProofing = 1;
	}
	if (isActiveOnlyShowFilter(filters, 'hasPassword')) {
		query.hasPassword = 1;
	}
	if (isActiveOnlyShowFilter(filters, 'hasVideos')) {
		query.hasVideos = 1;
	}

	return query;
}
