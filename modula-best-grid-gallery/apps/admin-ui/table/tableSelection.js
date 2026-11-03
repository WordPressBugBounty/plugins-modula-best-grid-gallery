/**
 * Selection and column filter rules of the Table, kept apart from React.
 */

/**
 * How many of the shown rows are selected. Ids selected elsewhere (rows of
 * another page) do not count.
 *
 * @param {Array} rowIds      Ids of the rows shown.
 * @param {Array} selectedIds
 * @return {'none'|'some'|'all'} The select-all checkbox state.
 */
export function selectAllState(rowIds, selectedIds) {
	const selected = new Set(selectedIds);
	const count = rowIds.filter((id) => selected.has(id)).length;
	if (0 === count) {
		return 'none';
	}

	return count === rowIds.length ? 'all' : 'some';
}

/**
 * The selection after the select-all checkbox is used: an empty selection
 * takes every shown row; any other clears.
 *
 * @param {Array} rowIds
 * @param {Array} selectedIds
 * @return {Array} Next selected ids.
 */
export function selectionAfterSelectAll(rowIds, selectedIds) {
	return 'none' === selectAllState(rowIds, selectedIds) ? [...rowIds] : [];
}

/**
 * Adds a value when absent, removes it when present, keeping the order of
 * the others (a row checkbox, a column filter option).
 *
 * @param {Array} values
 * @param {*}     value
 * @return {Array} Next values.
 */
export function toggleValue(values, value) {
	return values.includes(value)
		? values.filter((item) => item !== value)
		: [...values, value];
}
