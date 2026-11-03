/**
 * How the settings panel keys its sections (hub boxes and "More settings"
 * accordions). The panel's open state and Setting search share these keys.
 */

/**
 * Open state key: the category, then the ids of the submenu and drills above
 * the section (`lightbox/more/links/buttons`). Type-specific variants of a
 * section repeat its id, so they share one open state.
 *
 * @param {string}          parentKey Category name, or the key of the entry above.
 * @param {{ id?: string }} entry     Submenu or drill.
 * @return {string} The entry's key.
 */
export function buildSectionKey(parentKey, entry) {
	return `${parentKey}/${entry.id}`;
}

/**
 * @param {Object} submenu Hub submenu.
 * @return {boolean} True for a "More settings" submenu, which renders only
 *                   its sections (drills) as accordions.
 */
export function isMoreSettingsSubmenu(submenu) {
	return submenu.role === 'more';
}
