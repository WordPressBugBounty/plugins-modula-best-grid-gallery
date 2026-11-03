/**
 * Count preview-store images tagged with each filter name.
 */
import { countFilterTags } from 'editor-shell/logic';
import { filterBulkEditableImageRows } from '../components/bulk-edit/bulkEditUtils';

/**
 * @param {Object[]} items Gallery preview rows.
 * @return {Map<string, number>} How many images carry each name.
 */
export function buildFilterImageUsageCounts(items) {
	return countFilterTags(filterBulkEditableImageRows(items));
}
