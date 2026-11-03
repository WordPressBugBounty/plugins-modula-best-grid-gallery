import { DEFAULT_LISTING_VIEW } from './viewToListingQuery';
import {
	applyListingSort,
	getListingColumnFilters,
	getListingSegment,
	getListingSortValue,
} from './listingToolbarView';

/** Rows per page the footer offers and `/listing/view` accepts. */
export const LISTING_PER_PAGE_OPTIONS = [10, 20, 30, 50, 100];

/**
 * Keys stored in user meta for the content page list. Search and page are
 * per visit.
 *
 * @type {(keyof import('./viewToListingQuery').ListingView)[]}
 */
export const PERSISTED_VIEW_KEYS = [
	'sort',
	'perPage',
	'section',
	'segment',
	'columnFilters',
];

/**
 * @param {import('./viewToListingQuery').ListingView} view
 * @return {Partial<import('./viewToListingQuery').ListingView>} The keys `/listing/view` stores.
 */
export function pickPersistedView(view) {
	if (!view || typeof view !== 'object') {
		return {};
	}

	/** @type {Partial<import('./viewToListingQuery').ListingView>} */
	const persisted = {};
	for (const key of PERSISTED_VIEW_KEYS) {
		if (view[key] !== undefined) {
			persisted[key] = view[key];
		}
	}
	return persisted;
}

/**
 * Merge stored preferences into a fresh visit's view: no search, page 1.
 * Values the list no longer offers (a sort field, a page size, a status)
 * fall back to the defaults; views saved before the status segments open
 * on All.
 *
 * @param {Partial<import('./viewToListingQuery').ListingView>|null|undefined} persisted
 * @param {import('./viewToListingQuery').ListingView}                         [base]
 * @return {import('./viewToListingQuery').ListingView} The view the visit opens on.
 */
export function mergePersistedListingView(
	persisted,
	base = DEFAULT_LISTING_VIEW
) {
	const picked = pickPersistedView(
		persisted && typeof persisted === 'object' ? persisted : {}
	);
	const merged = { ...base, ...picked };

	// Re-applying the sort keeps one of the menu's three and sets page 1.
	return applyListingSort(
		{
			...merged,
			search: '',
			perPage: LISTING_PER_PAGE_OPTIONS.includes(merged.perPage)
				? merged.perPage
				: base.perPage,
			segment: getListingSegment(merged),
			columnFilters: getListingColumnFilters(merged),
		},
		getListingSortValue(merged)
	);
}
