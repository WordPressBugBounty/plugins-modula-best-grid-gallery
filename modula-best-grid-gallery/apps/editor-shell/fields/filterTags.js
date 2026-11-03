/**
 * The filter tags an item carries (a gallery image, an album member) as
 * comma-separated text in its `filters` field, kept in step with the
 * editor's filter name list (`filters.filters`). Shared by the gallery
 * editor and the Albums editor; each says which of its rows carry tags.
 * A list holds names as they are. In the text, a comma inside a name is
 * written `&#44;`, the encoding the visitor and the PHP helpers read
 * (gallery-shared `filterTagText`).
 *
 * @package
 */

import {
	encodeFilterTag,
	parseFilterTagText,
} from 'gallery-shared/utils/filterTagText';

/**
 * @param {unknown} filters An item's `filters`: text, or a list of names.
 * @return {string[]} Its trimmed, non-empty names.
 */
export function parseFilterTags(filters) {
	if (Array.isArray(filters)) {
		return filters.map((t) => String(t).trim()).filter(Boolean);
	}
	if (typeof filters === 'string') {
		return parseFilterTagText(filters);
	}
	return [];
}

/**
 * @param {unknown} filters Names, or text kept as it is.
 * @return {string} Comma-separated names.
 */
export function formatFilterTags(filters) {
	if (Array.isArray(filters)) {
		return filters
			.map((t) => String(t).trim())
			.filter(Boolean)
			.map(encodeFilterTag)
			.join(',');
	}
	return typeof filters === 'string' ? filters : '';
}

/**
 * @param {unknown} list `filters.filters`.
 * @return {string[]} The list's trimmed, non-empty names.
 */
export function filterListNames(list) {
	const raw = Array.isArray(list) ? list : [];
	return raw.map((tag) => String(tag).trim()).filter(Boolean);
}

/**
 * @param {Object[]} rows Rows that carry tags.
 * @return {Map<string, number>} How many rows carry each name.
 */
export function countFilterTags(rows) {
	/** @type {Map<string, number>} */
	const counts = new Map();
	for (const row of rows) {
		for (const tag of parseFilterTags(row.filters)) {
			counts.set(tag, (counts.get(tag) || 0) + 1);
		}
	}
	return counts;
}

/**
 * Removes names from every row that carries tags.
 *
 * @param {Object[]}                 rows
 * @param {string[]}                 removedNames
 * @param {(row: Object) => boolean} [isTaggable] Rows other than these keep their tags.
 * @return {{ items: Object[], changed: boolean }} The rows, new where a name left.
 */
export function stripFilterTags(rows, removedNames, isTaggable = () => true) {
	if (!Array.isArray(rows) || rows.length === 0) {
		return {
			items: Array.isArray(rows) ? rows : [],
			changed: false,
		};
	}
	const removed = new Set(
		(Array.isArray(removedNames) ? removedNames : [])
			.map((tag) => String(tag).trim())
			.filter(Boolean)
	);
	if (removed.size === 0) {
		return { items: rows, changed: false };
	}

	let changed = false;
	const items = rows.map((row) => {
		if (!row || !isTaggable(row)) {
			return row;
		}

		const tags = parseFilterTags(row.filters);
		const kept = tags.filter((tag) => !removed.has(tag));
		if (kept.length === tags.length) {
			return row;
		}

		changed = true;
		return {
			...row,
			filters: formatFilterTags(kept),
		};
	});

	return { items, changed };
}

/**
 * Removes names the list no longer has (a rename ended). An empty or
 * placeholder-only list strips nothing: it may be a wiped list that the
 * rows' tags refill on read.
 *
 * @param {Object[]}                 rows
 * @param {unknown}                  list         `filters.filters`.
 * @param {(row: Object) => boolean} [isTaggable] Rows other than these keep their tags.
 * @return {{ items: Object[], changed: boolean }} The rows, new where a name left.
 */
export function stripOrphanFilterTags(rows, list, isTaggable = () => true) {
	if (!Array.isArray(rows) || rows.length === 0) {
		return {
			items: Array.isArray(rows) ? rows : [],
			changed: false,
		};
	}

	const allowedNames = filterListNames(list);
	if (allowedNames.length === 0) {
		return { items: rows, changed: false };
	}

	const allowed = new Set(allowedNames);
	const orphans = new Set();
	for (const row of rows) {
		if (!row || !isTaggable(row)) {
			continue;
		}
		for (const tag of parseFilterTags(row.filters)) {
			if (!allowed.has(tag)) {
				orphans.add(tag);
			}
		}
	}

	return stripFilterTags(rows, [...orphans], isTaggable);
}

/**
 * The list with the names it lacks appended: names typed on an item join
 * the editor's filter list.
 *
 * @param {unknown}  list `filters.filters`.
 * @param {string[]} tags Names an item carries.
 * @return {string[]|null} The next list, or null when every name is listed.
 */
export function mergeFilterTagsIntoList(list, tags) {
	const next = Array.isArray(list) ? [...list] : [];
	let changed = false;
	for (const tag of tags) {
		const name = String(tag).trim();
		if (name && !next.includes(name)) {
			next.push(name);
			changed = true;
		}
	}
	return changed ? next : null;
}
