/**
 * Generated form schema (`npm run generate:settings-schemas` / `build:gallery-editor`).
 */
import raw from '../generated/modula-settings-form-schema';
import {
	bucketFieldsIntoDisplayRows,
	enrichField,
	sortEnrichedFields,
} from '../logic/enrichFormFields';

/** @type {Map<string, object>} */
let groupsById;

/**
 * @return {Map<string, object>} Group id → form schema group object (lazy singleton).
 */
export function getFormSchemaGroupsById() {
	if (!groupsById) {
		groupsById = new Map();
		for (const g of raw.groups || []) {
			if (g && g.id) {
				groupsById.set(g.id, g);
			}
		}
	}
	return groupsById;
}

/**
 * @param {string} groupId
 * @return {object[]|null} Fields array for the group, or null if unknown / no fields.
 */
export function getFieldsForGroup(groupId) {
	const g = getFormSchemaGroupsById().get(groupId);
	return g && Array.isArray(g.fields) ? g.fields : null;
}

/**
 * Find a form-schema field by its dotted grouped path (e.g. `general.type`).
 *
 * @param {string} groupedPath
 * @return {{ groupId: string, field: object } | null} Raw schema field and its group id, or null.
 */
export function findFieldByGroupedPath(groupedPath) {
	if (!groupedPath || typeof groupedPath !== 'string') {
		return null;
	}
	for (const [groupId, group] of getFormSchemaGroupsById()) {
		const fields = group?.fields;
		if (!Array.isArray(fields)) {
			continue;
		}
		const field = fields.find((f) => f?.groupedPath === groupedPath);
		if (field) {
			return { groupId, field };
		}
	}
	return null;
}

/**
 * Form group id from a field’s `groupedPath` (segment before the first dot).
 *
 * @param {{ groupedPath?: string }|null|undefined} field
 * @return {string} Group segment before the first dot, or empty when missing/invalid.
 */
export function getGroupKeyFromGroupedPath(field) {
	const p = field?.groupedPath;
	if (typeof p !== 'string') {
		return '';
	}
	const dot = p.indexOf('.');
	return dot > 0 ? p.slice(0, dot) : '';
}

/**
 * Localized label for `general.type` (same strings as the Gallery type select in the sidebar).
 *
 * @param {string|null|undefined} typeValue - e.g. `creative-gallery`, `story`
 * @return {string} Human-readable label for the type value, or the raw slug when unknown.
 */
export function getGalleryTypeOptionLabel(typeValue) {
	if (!typeValue || typeof typeValue !== 'string') {
		return '';
	}
	const hit = findFieldByGroupedPath('general.type');
	const labels = hit?.field?.control?.optionLabels;
	const label = labels?.[typeValue];
	if (typeof label === 'string' && label.trim() !== '') {
		return label;
	}
	return typeValue.replace(/-/g, ' ');
}

/**
 * Enriched field + group id for editor UI (visibility rules, control patches).
 *
 * @param {string} groupedPath
 * @return {{ groupId: string, field: object } | null} Enriched field for editor rules, or null.
 */
export function getEnrichedFieldByGroupedPath(groupedPath) {
	const hit = findFieldByGroupedPath(groupedPath);
	if (!hit) {
		return null;
	}
	const enrichedList = getEnrichedFieldsForGroup(hit.groupId);
	if (!enrichedList) {
		return null;
	}
	const field = enrichedList.find((f) => f.groupedPath === groupedPath);
	if (!field) {
		return null;
	}
	return { groupId: hit.groupId, field };
}

/**
 * Schema fields with editor UI metadata, sort order, and performance/speedup control patches.
 *
 * @param {string} groupId
 * @return {object[]|null} Enriched fields sorted for the editor, or null.
 */
export function getEnrichedFieldsForGroup(groupId) {
	const rawFields = getFieldsForGroup(groupId);
	if (!rawFields) {
		return null;
	}
	const enriched = rawFields.map((f, i) => enrichField(f, i));
	return sortEnrichedFields(enriched);
}

/**
 * @param {object[]} sortedEnrichedFields Output of {@link getEnrichedFieldsForGroup} after filters.
 * @return {{ type: 'single' | 'composite', fields: object[] }[]} Single-field rows or composite buckets.
 */
export function getDisplayRowsForFields(sortedEnrichedFields) {
	return bucketFieldsIntoDisplayRows(sortedEnrichedFields);
}

/**
 * @param {{ type: 'single' | 'composite', fields: object[] }[]} buckets Row buckets from {@link bucketFieldsIntoDisplayRows}.
 * @return {object[]} Row buckets with lone composites normalized to single-field rows.
 */
function normalizeSingleComposites(buckets) {
	return buckets.map((b) =>
		b.type === 'composite' && b.fields.length === 1
			? { type: 'single', fields: b.fields }
			: b
	);
}

/**
 * Wraps collapsible parent + consecutive child rows (editorUi from generated form schema).
 *
 * @param {{ type: 'single' | 'composite', fields: object[] }[]} rowBuckets
 * @return {object[]} Same buckets, with qualifying parent+child runs merged into hierarchy entries.
 */
function insertCollapsibleGroups(rowBuckets) {
	const out = [];
	let i = 0;
	while (i < rowBuckets.length) {
		const bucket = rowBuckets[i];
		const parentField = bucket?.fields?.[0];
		const childKeys = parentField?.editorUi?.collapsibleChildKeys;
		if (
			bucket.type === 'single' &&
			bucket.fields.length === 1 &&
			Array.isArray(childKeys) &&
			childKeys.length > 0
		) {
			const parentPath = parentField.groupedPath;
			const collected = [];
			for (let k = i + 1; k < rowBuckets.length; k++) {
				const b = rowBuckets[k];
				if (b.type !== 'single' || b.fields.length !== 1) {
					break;
				}
				const f = b.fields[0];
				if (f.editorUi?.collapsibleChildOf !== parentPath) {
					break;
				}
				collected.push(b);
			}
			if (collected.length > 0) {
				const ordered = childKeys
					.map((gk) =>
						collected.find((r) => r.fields[0].groupedKey === gk)
					)
					.filter(Boolean);
				if (ordered.length > 0) {
					out.push({
						type: 'hierarchy',
						parentField,
						childRowBuckets: ordered,
					});
					i += 1 + collected.length;
					continue;
				}
			}
		}
		out.push(bucket);
		i += 1;
	}
	return out;
}

/**
 * Display buckets including optional collapsible hierarchies (e.g. lightbox toolbar buttons).
 *
 * @param {object[]} sortedEnrichedFields Visible sorted fields for one group.
 * @return {object[]} Display row buckets, optionally including collapsible hierarchy groups.
 */
export function getDisplayBucketsForFields(sortedEnrichedFields) {
	return insertCollapsibleGroups(
		normalizeSingleComposites(
			bucketFieldsIntoDisplayRows(sortedEnrichedFields)
		)
	);
}

export function getFormSchemaVersion() {
	return raw.version || '0';
}
