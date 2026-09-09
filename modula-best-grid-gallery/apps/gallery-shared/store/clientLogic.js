/**
 * Modula Gallery - Client-side only logic (no API calls)
 * Used when pagination.type or filtering.type is 'client'.
 *
 * @package
 */

/**
 * Category/tag tokens for an item (matches PHP Catalog_Service::row_filter_tokens).
 *
 * @param {Object} item Gallery item row.
 * @return {string[]}
 */
export function itemFilterTokens(item) {
	if (Array.isArray(item?.categories) && item.categories.length > 0) {
		return item.categories;
	}
	if (Array.isArray(item?.tags) && item.tags.length > 0) {
		return item.tags;
	}
	const raw = item?.filters;
	if (Array.isArray(raw)) {
		return raw.map(String);
	}
	if (typeof raw === 'string' && raw.trim() !== '') {
		return raw
			.split(',')
			.map((part) => part.trim())
			.filter(Boolean);
	}
	return [];
}

/**
 * Filter items by key and value (same logic as legacy FilterManager).
 *
 * @param {Array}  items       - Items to filter
 * @param {string} filterKey   - Filter key
 * @param {*}      filterValue - Filter value
 * @return {Array} Filtered items
 */
export function filterItems(items, filterKey, filterValue) {
	return items.filter((item) => {
		if (filterKey === 'category' || filterKey === 'tag') {
			const itemCategories = itemFilterTokens(item);
			if (Array.isArray(filterValue)) {
				return filterValue.some((val) => itemCategories.includes(val));
			}
			return itemCategories.includes(filterValue);
		}
		if (filterKey === 'search') {
			const searchTerm = String(filterValue).toLowerCase();
			const searchableText = [
				item.title,
				item.caption,
				item.description,
				item.alt,
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return searchableText.includes(searchTerm);
		}
		if (Object.prototype.hasOwnProperty.call(item, filterKey)) {
			if (Array.isArray(filterValue)) {
				return filterValue.includes(item[filterKey]);
			}
			return item[filterKey] === filterValue;
		}
		return false;
	});
}

/**
 * Slice items for current page (client-side pagination).
 *
 * @param {Array}  items        - Full list
 * @param {number} currentPage  - 1-based page
 * @param {number} perPage     - Items per page
 * @return {Array} Page slice
 */
export function getPageSlice(items, currentPage, perPage) {
	const start = (currentPage - 1) * perPage;
	return items.slice(start, start + perPage);
}

/**
 * @param {string} mode Pagination mode from Redux.
 * @return {boolean}
 */
export function isAppendPaginationMode(mode) {
	return mode === 'load-more' || mode === 'infinite-scroll';
}

/**
 * @param {number} listLength
 * @param {number} perPage
 * @return {{ totalItems: number, totalPages: number }}
 */
export function clientPaginationTotals(listLength, perPage) {
	const totalItems = listLength;
	const totalPages = Math.max(1, Math.ceil(totalItems / perPage) || 1);
	return { totalItems, totalPages };
}
