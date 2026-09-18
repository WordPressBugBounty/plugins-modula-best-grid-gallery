/**
 * Count gallery images tagged with each filter name (visitor bar + shared logic).
 */

import { itemFilterTokens } from '../store/clientLogic';
import { isEmbeddedGalleryItemRow } from './embeddedGalleryItemKinds';

/**
 * @param {unknown} item
 * @return {boolean}
 */
function isCountableFilterImage(item) {
	if (!item || typeof item !== 'object') {
		return false;
	}
	if (isEmbeddedGalleryItemRow(item)) {
		return false;
	}
	const id = /** @type {{ id?: unknown }} */ (item).id;
	return id !== undefined && id !== null && String(id).trim() !== '';
}

/**
 * @param {unknown} items Gallery item rows (prefer the full catalog / originalItems).
 * @return {Map<string, number>}
 */
export function buildFilterImageUsageCounts(items) {
	/** @type {Map<string, number>} */
	const counts = new Map();
	if (!Array.isArray(items)) {
		return counts;
	}
	for (const item of items) {
		if (!isCountableFilterImage(item)) {
			continue;
		}
		for (const tag of itemFilterTokens(item)) {
			const key = String(tag).trim();
			if (!key) {
				continue;
			}
			counts.set(key, (counts.get(key) || 0) + 1);
		}
	}
	return counts;
}

/**
 * Count of filterable images in a catalog (for the All label).
 *
 * @param {unknown} items
 * @return {number}
 */
export function countFilterableGalleryImages(items) {
	if (!Array.isArray(items)) {
		return 0;
	}
	let n = 0;
	for (const item of items) {
		if (isCountableFilterImage(item)) {
			n += 1;
		}
	}
	return n;
}

/**
 * Resolve visitor filter-bar counts from a full-catalog bootstrap map when present,
 * otherwise from the provided item list (page slice or full client catalog).
 *
 * @param {Object} args
 * @param {unknown} [args.items]
 * @param {Map<string, number>|Record<string, number>|null|undefined} [args.catalogUsageCounts]
 * @param {number|null|undefined} [args.catalogFilterableCount]
 * @return {{ filterCounts: Map<string, number>, allCount: number }}
 */
export function resolveFilterBarUsageCounts({
	items,
	catalogUsageCounts = null,
	catalogFilterableCount = null,
} = {}) {
	if (catalogUsageCounts instanceof Map) {
		return {
			filterCounts: catalogUsageCounts,
			allCount:
				typeof catalogFilterableCount === 'number'
					? catalogFilterableCount
					: countFilterableGalleryImages(items),
		};
	}
	if (
		catalogUsageCounts &&
		typeof catalogUsageCounts === 'object' &&
		!Array.isArray(catalogUsageCounts)
	) {
		/** @type {Map<string, number>} */
		const filterCounts = new Map();
		for (const [key, value] of Object.entries(catalogUsageCounts)) {
			const name = String(key).trim();
			if (!name) {
				continue;
			}
			filterCounts.set(name, Number(value) || 0);
		}
		return {
			filterCounts,
			allCount:
				typeof catalogFilterableCount === 'number'
					? catalogFilterableCount
					: countFilterableGalleryImages(items),
		};
	}
	return {
		filterCounts: buildFilterImageUsageCounts(items),
		allCount: countFilterableGalleryImages(items),
	};
}

/**
 * Append a usage count to a filter label for native `<option>` text.
 *
 * @param {string}              label
 * @param {number|undefined|null} count
 * @param {boolean}             showCount
 * @return {string}
 */
export function formatFilterLabelWithCount(label, count, showCount) {
	const base = label == null ? '' : String(label);
	if (!showCount || count === undefined || count === null) {
		return base;
	}
	return `${base} ${Number(count) || 0}`;
}
