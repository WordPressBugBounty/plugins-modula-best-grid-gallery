/**
 * Runtime object from PHP (`wp_localize_script` → `window.modulaSettingsEditor`).
 * Use {@link getModulaSettingsEditorConfig} from modules, hooks, or patches (no direct `window` reads).
 */

/**
 * @return {Record<string, unknown>} Same reference as `window.modulaSettingsEditor` when set; otherwise `{}`. On SSR (`window` missing), `{}`.
 */
export function getModulaSettingsEditorConfig() {
	if (typeof window === 'undefined') {
		return {};
	}
	return window.modulaSettingsEditor || {};
}

/**
 * Patch localized bootstrap config (single write path for runtime updates).
 *
 * @param {Record<string, unknown>} partial
 * @returns {Record<string, unknown>}
 */
export function patchModulaSettingsEditorConfig(partial) {
	if (typeof window === 'undefined') {
		return {};
	}
	const current = getModulaSettingsEditorConfig();
	window.modulaSettingsEditor = {
		...current,
		...partial,
	};
	return window.modulaSettingsEditor;
}
