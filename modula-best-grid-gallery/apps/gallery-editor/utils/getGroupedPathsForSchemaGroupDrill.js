import { getEnrichedFieldsForGroup } from '../data/formSchema';
import { sortEnrichedFields } from '../logic/enrichFormFields';

/**
 * `groupedPath` values for a schema group (including `sidebarNestedOnly`),
 * for opening a nested sidebar frame from a category hub `drill` section.
 *
 * Returns every schema path in the group (except `omitFromSchemaGroupDrill`).
 * Do not pre-filter by `isFieldVisible` — the nested stack re-evaluates visibility
 * on each render so dependent fields (e.g. gallery title markup) appear when toggles change.
 *
 * @param {string}                                    groupKey
 * @param {Record<string, Record<string, unknown>>}   [_values] Unused; kept for call-site stability.
 * @return {string[]}
 */
export function getGroupedPathsForSchemaGroupDrill(groupKey, _values) {
	const all = getEnrichedFieldsForGroup(groupKey);
	if (!all || all.length === 0) {
		return [];
	}
	const paths = sortEnrichedFields(
		all.filter((f) => !f.editorUi?.omitFromSchemaGroupDrill)
	);
	return paths.map((f) => f.groupedPath).filter(Boolean);
}
