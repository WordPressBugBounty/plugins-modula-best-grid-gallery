/**
 * Count preview-store images tagged with each filter name.
 */
import {
	filterBulkEditableImageRows,
	parseFiltersField,
} from '../components/bulk-edit/bulkEditUtils';

/**
 * @param {Object[]} items Gallery preview rows.
 * @return {Map<string, number>}
 */
export function buildFilterImageUsageCounts(items) {
	/** @type {Map<string, number>} */
	const counts = new Map();
	for (const row of filterBulkEditableImageRows(items)) {
		for (const tag of parseFiltersField(row.filters)) {
			counts.set(tag, (counts.get(tag) || 0) + 1);
		}
	}
	return counts;
}
