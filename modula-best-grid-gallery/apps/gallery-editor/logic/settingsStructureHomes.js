/**
 * Where each stored gallery setting lives in the settings editor structure
 * (its "home"): the shared editor-shell rule, bound to the gallery's rows that
 * edit other stored paths.
 */
import { collectSettingHomes as collectEditorSettingHomes } from 'editor-shell/logic';

/**
 * Fields whose row edits other stored paths: the Motion Hover menu writes
 * the chosen preset into the hover builder (its Customize, hidden for now,
 * opened the builder). Their placement in the structure is the home of
 * those stored paths.
 *
 * @type {Record<string, string[]>}
 */
const STORED_PATHS_BY_ROW_FIELD = {
	'motion.hover': ['motion.hover', 'hover.builder'],
};

/**
 * @param {Object[]}                         categories         `SETTINGS_EDITOR_CATEGORIES`
 * @param {Object}                           deps
 * @param {(drill: Object) => string[]}      deps.getDrillPaths Paths a drill without `items` opens.
 * @param {(groupedPath: string) => boolean} deps.isStoredPath  True for persisted settings.
 * @return {Map<string, Set<string>>} Stored grouped path → homes.
 */
export function collectSettingHomes(
	categories,
	{ getDrillPaths, isStoredPath }
) {
	return collectEditorSettingHomes(categories, {
		getDrillPaths,
		isStoredPath,
		storedPathsOf: (groupedPath) =>
			STORED_PATHS_BY_ROW_FIELD[groupedPath] || [groupedPath],
	});
}
