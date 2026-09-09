import { DEFAULT_LISTING_VIEW } from './viewToListingQuery';

/** Legacy field ids removed from the table — strip from persisted views. */
export const LISTING_LEGACY_FIELD_IDS = ['listingActions'];

/** Field ids used for DataViews filters only — never table columns. */
export const LISTING_FILTER_ONLY_FIELD_IDS = [
	'rowType',
	'hasProofing',
	'hasPassword',
	'hasVideos',
];

/**
 * Keys stored in user meta for the gallery listing view.
 *
 * @type {(keyof ListingView)[]}
 */
export const PERSISTED_VIEW_KEYS = [
	'type',
	'fields',
	'sort',
	'perPage',
	'layout',
	'titleField',
	'mediaField',
];

/**
 * @param {ListingView} view
 * @return {Partial<ListingView>}
 */
export function pickPersistedView(view) {
	if (!view || typeof view !== 'object') {
		return {};
	}

	/** @type {Partial<ListingView>} */
	const persisted = {};
	for (const key of PERSISTED_VIEW_KEYS) {
		if (view[key] !== undefined) {
			persisted[key] = view[key];
		}
	}
	return persisted;
}

/**
 * Merge stored preferences into a fresh session view (no search/filters).
 *
 * @param {Partial<ListingView>|null|undefined} persisted
 * @param {ListingView} [base]
 * @return {ListingView}
 */
/**
 * Drop primary/media fields from visible columns — DataViews renders those separately.
 *
 * @param {ListingView} view
 * @return {string[]}
 */
export function normalizeListingViewFields(view) {
	const titleField =
		typeof view.titleField === 'string' ? view.titleField : 'gallery';
	const mediaField =
		typeof view.mediaField === 'string' ? view.mediaField : 'preview';
	const fields = Array.isArray(view.fields) ? view.fields : [];

	return fields.filter(
		(id) =>
			id !== titleField &&
			id !== mediaField &&
			!LISTING_FILTER_ONLY_FIELD_IDS.includes(id) &&
			!LISTING_LEGACY_FIELD_IDS.includes(id)
	);
}

export function mergePersistedListingView(
	persisted,
	base = DEFAULT_LISTING_VIEW
) {
	const picked = persisted && typeof persisted === 'object' ? persisted : {};

	const merged = {
		...base,
		...pickPersistedView({ ...base, ...picked }),
		search: '',
		filters: [],
		page: 1,
	};

	return {
		...merged,
		fields: normalizeListingViewFields(merged),
	};
}
