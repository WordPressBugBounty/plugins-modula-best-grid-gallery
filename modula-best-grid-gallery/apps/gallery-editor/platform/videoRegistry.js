/**
 * Registry for video settings-editor actions (Pro registers at runtime).
 */

/**
 * @typedef {{
 *   openMediaLibrary?: (opts: Record<string, unknown>) => void,
 * }} VideoEditorRegistration
 */

/** @type {VideoEditorRegistration|null} */
let registration = null;

/**
 * @param {VideoEditorRegistration} entry
 */
export function registerVideoEditor(entry) {
	if (!entry || typeof entry !== 'object') {
		return;
	}
	registration = { ...entry };
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('modulaVideoRegistered'));
	}
}

/**
 * @returns {VideoEditorRegistration|null}
 */
export function getVideoEditorRegistration() {
	return registration;
}
