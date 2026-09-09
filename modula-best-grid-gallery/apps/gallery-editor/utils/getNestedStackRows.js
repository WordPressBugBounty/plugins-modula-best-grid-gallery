/**
 * Resolve visible nested-stack field rows for a sidebar drill frame.
 */
import {
	getDisplayBucketsForFields,
	getEnrichedFieldByGroupedPath,
} from '../data/formSchema';
import { isFieldVisible } from '../logic/fieldVisibility';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';
import { shouldHideFieldForPanelUpsell } from '../logic/proGateLock';

/**
 * @param {object} row
 * @return {boolean}
 */
function isHeadingDisplayRow(row) {
	return (
		Array.isArray(row?.fields) &&
		row.fields.length === 1 &&
		row.fields[0]?.control?.kind === 'heading'
	);
}

/**
 * Drop section headings that have no following non-heading rows before the next heading.
 *
 * @param {object[]} rows
 * @return {object[]}
 */
function dropOrphanHeadingRows(rows) {
	if (!Array.isArray(rows) || rows.length === 0) {
		return rows;
	}
	const out = [];
	for (let i = 0; i < rows.length; i += 1) {
		if (!isHeadingDisplayRow(rows[i])) {
			out.push(rows[i]);
			continue;
		}
		let hasContent = false;
		for (let j = i + 1; j < rows.length; j += 1) {
			if (isHeadingDisplayRow(rows[j])) {
				break;
			}
			hasContent = true;
			break;
		}
		if (hasContent) {
			out.push(rows[i]);
		}
	}
	return out;
}

/**
 * @param {{ title?: string, groupedPaths?: string[], nestedUpsellGroupedPath?: string }} frame
 * @param {Object} values Form values
 * @return {{ rows: object[] }}
 */
export function getNestedStackRows(frame, values) {
	const paths = Array.isArray(frame?.groupedPaths) ? frame.groupedPaths : [];
	if (paths.length === 0) {
		return { rows: [] };
	}
	const editor = getModulaSettingsEditorConfig();
	const seen = new Set();
	/** @type {object[]} */
	const fields = [];
	for (const p of paths) {
		if (typeof p !== 'string') {
			continue;
		}
		const hit = getEnrichedFieldByGroupedPath(p.trim());
		if (!hit || seen.has(hit.field.groupedPath)) {
			continue;
		}
		if (shouldHideFieldForPanelUpsell(hit.field, frame, editor)) {
			continue;
		}
		if (!isFieldVisible(hit.field, values)) {
			continue;
		}
		seen.add(hit.field.groupedPath);
		fields.push(hit.field);
	}
	const rows = dropOrphanHeadingRows(getDisplayBucketsForFields(fields));
	return { rows };
}
