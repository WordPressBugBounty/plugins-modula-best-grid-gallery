/**
 * Theme-inherited visitor controls: pagination + filter-bar control paint gate.
 *
 * Schema default is OFF so hydrate/sanitize of missing keys keep existing
 * galleries on plugin paint. New Beta gallery create stamps ON explicitly.
 *
 * @package
 */

/** @type {boolean} */
export const THEME_INHERIT_CONTROLS_CREATE_DEFAULT = true;

/** Root modifier when theme inherit is on (gates opinionated control paint). */
export const THEME_INHERIT_CONTROLS_ROOT_CLASS =
	'modula--theme-inherit-controls';

/**
 * Explicit on only — missing/undefined stays off (existing galleries).
 *
 * @param {unknown} raw Grouped or config value.
 * @return {boolean}
 */
export function isThemeInheritControlsOn(raw) {
	if (raw === true || raw === 1 || raw === '1') {
		return true;
	}
	if (typeof raw === 'string' && raw.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}
