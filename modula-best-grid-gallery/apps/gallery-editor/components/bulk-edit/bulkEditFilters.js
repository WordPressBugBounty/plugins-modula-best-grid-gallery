/**
 * Bulk edit's footer filter actions: one filter name added to, or removed
 * from, every ticked row. The result is draft patches; "Save all" saves them
 * and merges new names into the gallery's filter list (`bulkEditSave.js`).
 * Names compare as they are, as editor-shell's filter tag rules do.
 */
import { formatFilterTags, parseFilterTags } from 'editor-shell/logic';
import { bulkEditRowKey } from './bulkEditUtils';

/** @typedef {(row: Object, field: string) => unknown} BulkEditRowField */

/** @typedef {{ rowKey: string, filters: string }} BulkEditFilterPatch */

/**
 * @param {Object[]}                     rows
 * @param {BulkEditRowField}             getRowField Draft value first, then the row's.
 * @param {(tags: string[]) => string[]} nextTags    The row's next names.
 * @return {BulkEditFilterPatch[]} One patch per row whose names change.
 */
function filterPatches(rows, getRowField, nextTags) {
	/** @type {BulkEditFilterPatch[]} */
	const patches = [];
	for (const row of rows) {
		const tags = parseFilterTags(getRowField(row, 'filters'));
		const next = nextTags(tags);
		if (next.length === tags.length) {
			continue;
		}
		patches.push({
			rowKey: bulkEditRowKey(row),
			filters: formatFilterTags(next),
		});
	}
	return patches;
}

/**
 * @param {Object[]}         rows        The ticked rows.
 * @param {BulkEditRowField} getRowField
 * @param {string}           name        Filter to add.
 * @return {BulkEditFilterPatch[]} Rows that lacked it.
 */
export function bulkEditAddFilterPatches(rows, getRowField, name) {
	const tag = String(name).trim();
	if (!tag) {
		return [];
	}
	return filterPatches(rows, getRowField, (tags) =>
		tags.includes(tag) ? tags : [...tags, tag]
	);
}

/**
 * @param {Object[]}         rows        The ticked rows.
 * @param {BulkEditRowField} getRowField
 * @param {string}           name        Filter to remove.
 * @return {BulkEditFilterPatch[]} Rows that had it.
 */
export function bulkEditRemoveFilterPatches(rows, getRowField, name) {
	const tag = String(name).trim();
	return filterPatches(rows, getRowField, (tags) =>
		tags.filter((t) => t !== tag)
	);
}

/**
 * @param {Object[]}         rows        The ticked rows.
 * @param {BulkEditRowField} getRowField
 * @return {string[]} Names at least one row carries, first seen first.
 */
export function bulkEditFilterNamesOnRows(rows, getRowField) {
	const names = new Set();
	for (const row of rows) {
		parseFilterTags(getRowField(row, 'filters')).forEach((tag) =>
			names.add(tag)
		);
	}
	return [...names];
}
