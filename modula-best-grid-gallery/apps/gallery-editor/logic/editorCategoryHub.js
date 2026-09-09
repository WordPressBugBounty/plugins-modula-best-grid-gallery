/**
 * Hub panel: categories may define `hubSections` in `editorNavigation` (PHP) instead of a flat `groups` list.
 * See `settings-v2-editor-navigation.php` — `type`: `group` | `drill` | `submenu` | `field` | `note`.
 */

/**
 * @typedef {'group' | 'drill' | 'submenu' | 'field' | 'note'} HubSectionType
 */

/**
 * @typedef {Object} HubSectionDrillOrGroup
 * @property {HubSectionType} type
 * @property {string}         group            Schema group id (`slider`, `pagination`, …).
 * @property {Object}         [auxiliaryPanel] Optional stack-frame auxiliary (e.g. hover effect picker).
 */

/**
 * @typedef {Object} HubSectionSubmenu
 * @property {'submenu'} type
 * @property {string}    [label] Accessible name for the grouped block.
 * @property {object[]}  items   Nested sections (`group` | `drill` | `field` | `note`).
 */

/**
 * Static hub callout — section heading + body caption (no chevron / drill).
 *
 * @typedef {Object} HubSectionNote
 * @property {'note'} type
 * @property {string} [label] Section heading (uppercase chrome band in takeover).
 * @property {string} [text]  Body caption under the heading.
 */

/**
 * @param {Object} cat Category from `SETTINGS_EDITOR_CATEGORIES`.
 * @return {boolean}
 */
export function categoryHasHubSections(cat) {
	return Array.isArray(cat?.hubSections) && cat.hubSections.length > 0;
}

/**
 * Collect ordered unique group keys from hub sections (including nested `submenu` items).
 *
 * @param {object[]} sections
 * @param {string[]} [into]
 * @return {string[]}
 */
function collectHubGroupKeys(sections, into = []) {
	const seen = new Set(into);
	for (const s of sections) {
		if (!s || typeof s !== 'object') {
			continue;
		}
		if (s.type === 'note') {
			continue;
		}
		if (s.type === 'field' && typeof s.groupedPath === 'string') {
			const dot = s.groupedPath.indexOf('.');
			if (dot > 0) {
				const g = s.groupedPath.slice(0, dot);
				if (g !== '' && !seen.has(g)) {
					seen.add(g);
					into.push(g);
				}
			}
			continue;
		}
		if (
			s.type === 'drill' &&
			Array.isArray(s.groupedPaths) &&
			s.groupedPaths.length > 0
		) {
			for (const p of s.groupedPaths) {
				if (typeof p !== 'string' || !p.includes('.')) {
					continue;
				}
				const g = p.split('.')[0];
				if (g !== '' && !seen.has(g)) {
					seen.add(g);
					into.push(g);
				}
			}
			continue;
		}
		if (
			(s.type === 'group' || s.type === 'drill') &&
			typeof s.group === 'string' &&
			s.group !== '' &&
			!seen.has(s.group)
		) {
			seen.add(s.group);
			into.push(s.group);
		}
		if (s.type === 'submenu' && Array.isArray(s.items)) {
			collectHubGroupKeys(s.items, into);
		}
	}
	return into;
}

/**
 * Group keys for command palette / search: derived from `hubSections`, or legacy `groups`.
 *
 * @param {Object} cat
 * @return {string[]}
 */
export function getCategoryGroupKeys(cat) {
	if (categoryHasHubSections(cat)) {
		return collectHubGroupKeys(cat.hubSections);
	}
	return Array.isArray(cat.groups) ? cat.groups : [];
}

/**
 * True if any `drill` / `field` section exists (nested drills count). Notes do not require values.
 *
 * @param {object[]|null|undefined} sections
 * @return {boolean}
 */
export function hubSectionsNeedFormValues(sections) {
	if (!Array.isArray(sections)) {
		return false;
	}
	for (const s of sections) {
		if (!s || typeof s !== 'object') {
			continue;
		}
		if (s.type === 'drill' || s.type === 'field') {
			return true;
		}
		if (s.type === 'submenu' && hubSectionsNeedFormValues(s.items)) {
			return true;
		}
	}
	return false;
}
