/**
 * Where each stored setting lives in an editor's settings structure (its "home").
 *
 * A home is the category name followed by the ids (or, for unnamed entries,
 * labels) of the hub sections and drills that lead to the field, for example
 * `layout › hub › captions › title-style`. Type-specific variants of one
 * section share its id, so they count as one home. The gallery and the Albums
 * editor bind it to their own schema.
 */

/**
 * @param {Object} entry Hub section, submenu or drill.
 * @return {string} Step name for the home chain.
 */
function homeStep(entry) {
	for (const key of ['id', 'label', 'group']) {
		if (typeof entry[key] === 'string' && entry[key].trim() !== '') {
			return entry[key].trim();
		}
	}
	return '';
}

/**
 * @param {string} groupedPath
 * @return {string[]} The row edits only its own stored path.
 */
function ownStoredPath(groupedPath) {
	return [groupedPath];
}

/**
 * @param {Object[]}                          categories           `SETTINGS_EDITOR_CATEGORIES`
 * @param {Object}                            deps
 * @param {(drill: Object) => string[]}       deps.getDrillPaths   Paths a drill without `items` opens.
 * @param {(groupedPath: string) => boolean}  deps.isStoredPath    True for persisted settings.
 * @param {(groupedPath: string) => string[]} [deps.storedPathsOf] Stored paths a row edits; its placement is their home.
 * @return {Map<string, Set<string>>} Stored grouped path → homes.
 */
export function collectSettingHomes(
	categories,
	{ getDrillPaths, isStoredPath, storedPathsOf = ownStoredPath }
) {
	/** @type {Map<string, Set<string>>} */
	const homes = new Map();

	const addHome = (groupedPath, chain) => {
		for (const path of storedPathsOf(groupedPath)) {
			if (!isStoredPath(path)) {
				continue;
			}
			if (!homes.has(path)) {
				homes.set(path, new Set());
			}
			homes.get(path).add(chain.join(' › '));
		}
	};

	const visit = (entries, chain) => {
		if (!Array.isArray(entries)) {
			return;
		}
		for (const entry of entries) {
			if (!entry || typeof entry !== 'object') {
				continue;
			}
			if (
				entry.type === 'field' &&
				typeof entry.groupedPath === 'string'
			) {
				addHome(entry.groupedPath.trim(), chain);
				continue;
			}
			if (entry.type === 'submenu') {
				visit(entry.items, [...chain, homeStep(entry)]);
				continue;
			}
			if (entry.type !== 'drill') {
				continue;
			}
			const drillChain = [...chain, homeStep(entry)];
			if (Array.isArray(entry.items)) {
				visit(entry.items, drillChain);
				continue;
			}
			for (const path of getDrillPaths(entry)) {
				addHome(path, drillChain);
			}
		}
	};

	for (const category of categories) {
		visit(category?.hubSections, [category?.name ?? '']);
	}
	return homes;
}
