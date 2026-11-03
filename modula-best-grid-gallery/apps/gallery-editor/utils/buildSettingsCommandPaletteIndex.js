/**
 * Static index for settings command palette: categories, groups, fields from editor structure + form schema.
 *
 * @param {Record<string, string>} [groupLabelOverrides] `formUi.groupLabels` from runtime config (optional).
 */
import {
	SETTINGS_EDITOR_CATEGORIES,
	GROUP_LABELS,
} from '../constants/editorStructure';
import { getCategoryGroupKeys } from '../logic/editorCategoryHub';
import { getEnrichedFieldsForGroup } from '../data/formSchema';
import { humanizeKey } from '../logic/humanizeKey';
import { fieldDescriptionBlob, normalizeBlob } from 'editor-shell/logic';

/**
 * @param {Array<Record<string, unknown>>}  out
 * @param {{ name: string, title: string }} cat
 * @param {string}                          groupKey
 * @param {Record<string, string>}          groupLabelOverrides
 */
function appendPaletteGroupEntries(out, cat, groupKey, groupLabelOverrides) {
	const groupTitle =
		groupLabelOverrides[groupKey] || GROUP_LABELS[groupKey] || groupKey;

	out.push({
		kind: 'group',
		id: `group:${cat.name}:${groupKey}`,
		title: groupTitle,
		categoryName: cat.name,
		groupKey,
		searchBlob: normalizeBlob([
			groupTitle,
			groupKey,
			cat.title,
			String(groupTitle).replace(/\s+/g, ''),
		]),
	});

	const fields = getEnrichedFieldsForGroup(groupKey);
	if (!fields || fields.length === 0) {
		return;
	}

	for (const f of fields) {
		const path = typeof f.groupedPath === 'string' ? f.groupedPath : '';
		if (!path) {
			continue;
		}
		const title =
			typeof f.editorLabel === 'string' && f.editorLabel.trim() !== ''
				? f.editorLabel.trim()
				: humanizeKey(f.groupedKey);
		out.push({
			kind: 'field',
			id: `field:${path}`,
			title,
			categoryName: cat.name,
			groupKey,
			groupedPath: path,
			searchBlob: normalizeBlob([
				title,
				path,
				f.flatKey,
				fieldDescriptionBlob(f),
				groupTitle,
				cat.title,
			]),
			_field: f,
		});
	}
}

/**
 * @param {Record<string, string>} groupLabelOverrides
 * @return {Array<Record<string, unknown>>} Palette rows (categories, groups, fields).
 */
export function buildSettingsCommandPaletteIndex(groupLabelOverrides = {}) {
	/** @type {Array<Record<string, unknown>>} */
	const out = [];

	for (const cat of SETTINGS_EDITOR_CATEGORIES) {
		out.push({
			kind: 'category',
			id: `cat:${cat.name}`,
			title: cat.title,
			categoryName: cat.name,
			searchBlob: normalizeBlob([
				cat.title,
				cat.name,
				typeof cat.description === 'string' ? cat.description : '',
			]),
		});

		for (const groupKey of getCategoryGroupKeys(cat)) {
			appendPaletteGroupEntries(out, cat, groupKey, groupLabelOverrides);
		}
	}

	return out;
}
