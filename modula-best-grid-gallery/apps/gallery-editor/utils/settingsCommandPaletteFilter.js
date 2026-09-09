/**
 * Visibility + text search for command palette entries.
 */
import { SETTINGS_EDITOR_CATEGORIES } from '../constants/editorStructure';
import { getEnrichedFieldsForGroup } from '../data/formSchema';
import { isCategoryVisible } from '../logic/categoryVisibility';
import { isFieldVisible } from '../logic/fieldVisibility';

/**
 * @param {import('./settingsCommandPaletteEntries').PaletteIndexEntry} e
 * @return {import('./settingsCommandPaletteEntries').PaletteIndexEntry}
 */
function stripInternalField(e) {
	if (e.kind !== 'field') {
		return e;
	}
	const { _field, ...rest } = /** @type {import('./settingsCommandPaletteEntries').PaletteIndexFieldEntry} */ (
		e
	);
	return rest;
}

/**
 * @param {import('./settingsCommandPaletteEntries').PaletteIndexEntry[]} entries
 * @param {Record<string, Record<string, unknown>>} values
 * @return {import('./settingsCommandPaletteEntries').PaletteIndexEntry[]}
 */
export function filterPaletteEntries(entries, values) {
	const visibleCategoryNames = new Set(
		SETTINGS_EDITOR_CATEGORIES.filter((c) =>
			isCategoryVisible(c, values)
		).map((c) => c.name)
	);

	/** @type {import('./settingsCommandPaletteEntries').PaletteIndexEntry[]} */
	const out = [];

	for (const e of entries) {
		if (!visibleCategoryNames.has(e.categoryName)) {
			continue;
		}
		if (e.kind === 'category') {
			out.push(e);
			continue;
		}
		if (e.kind === 'group') {
			const schemaFields = getEnrichedFieldsForGroup(e.groupKey);
			const anyVisible = schemaFields?.some((f) =>
				isFieldVisible(f, values)
			);
			if (anyVisible) {
				out.push(e);
			}
			continue;
		}
		if (e.kind === 'field') {
			const raw =
				/** @type {import('./settingsCommandPaletteEntries').PaletteIndexFieldEntry} */ (e);
			const f = raw._field;
			if (!f || !isFieldVisible(f, values)) {
				continue;
			}
			out.push(stripInternalField(e));
		}
	}

	return out;
}

/**
 * @param {string} q
 * @return {string[]}
 */
export function tokenizeQuery(q) {
	return q
		.toLowerCase()
		.trim()
		.split(/\s+/)
		.filter(Boolean);
}

/**
 * @param {import('./settingsCommandPaletteEntries').PaletteIndexEntry[]} entries
 * @param {string} query
 * @return {import('./settingsCommandPaletteEntries').PaletteIndexEntry[]}
 */
export function searchPaletteEntries(entries, query) {
	const tokens = tokenizeQuery(query);
	if (tokens.length === 0) {
		return entries;
	}
	return entries.filter((e) =>
		tokens.every((t) => e.searchBlob.includes(t))
	);
}
