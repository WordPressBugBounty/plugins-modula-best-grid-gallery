/**
 * Keep per-image filter tags aligned with the gallery-level filter name list.
 */
import { isEmbeddedGalleryItemRow } from './embeddedGalleryItems';
import {
	filtersFieldToString,
	parseFiltersField,
} from '../components/bulk-edit/bulkEditUtils';

/**
 * @param {unknown} filtersArr `filters.filters` from gallery settings.
 * @return {string[]}
 */
export function normalizeGalleryFilterNames(filtersArr) {
	const raw = Array.isArray(filtersArr) ? filtersArr : [];
	return raw.map((tag) => String(tag).trim()).filter(Boolean);
}

/**
 * Remove specific filter tags from every image row.
 *
 * @param {Object[]} coreItems
 * @param {string[]} removedNames
 * @return {{ items: Object[], changed: boolean }}
 */
export function stripRemovedImageFiltersFromCoreItems(coreItems, removedNames) {
	if (!Array.isArray(coreItems) || coreItems.length === 0) {
		return {
			items: Array.isArray(coreItems) ? coreItems : [],
			changed: false,
		};
	}
	const removed = new Set(
		(Array.isArray(removedNames) ? removedNames : [])
			.map((tag) => String(tag).trim())
			.filter(Boolean)
	);
	if (removed.size === 0) {
		return { items: coreItems, changed: false };
	}

	let changed = false;
	const items = coreItems.map((row) => {
		if (!row || isEmbeddedGalleryItemRow(row)) {
			return row;
		}

		const tags = parseFiltersField(row.filters);
		const kept = tags.filter((tag) => !removed.has(tag));
		if (kept.length === tags.length) {
			return row;
		}

		changed = true;
		return {
			...row,
			filters: filtersFieldToString(kept),
		};
	});

	return { items, changed };
}

/**
 * Remove image tags that no longer exist in the gallery filter list.
 *
 * @param {Object[]} coreItems Preview catalog (gallery items).
 * @param {string[]} galleryFilterNames Active gallery filter labels.
 * @return {{ items: Object[], changed: boolean }}
 */
export function stripOrphanedImageFiltersFromCoreItems(
	coreItems,
	galleryFilterNames
) {
	if (!Array.isArray(coreItems) || coreItems.length === 0) {
		return {
			items: Array.isArray(coreItems) ? coreItems : [],
			changed: false,
		};
	}

	const allowed = new Set(galleryFilterNames);
	const removedNames = [];

	for (const row of coreItems) {
		if (!row || isEmbeddedGalleryItemRow(row)) {
			continue;
		}
		for (const tag of parseFiltersField(row.filters)) {
			if (!allowed.has(tag)) {
				removedNames.push(tag);
			}
		}
	}

	return stripRemovedImageFiltersFromCoreItems(coreItems, [
		...new Set(removedNames),
	]);
}
