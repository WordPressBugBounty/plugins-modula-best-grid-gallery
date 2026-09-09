/**
 * Registry for pagination settings-editor UI (Pro registers at runtime).
 */

/** @typedef {import('react').ComponentType<Record<string, unknown>>} PaginationSlotComponent */

/**
 * @typedef {{
 *   PreviewPanel?: PaginationSlotComponent,
 * }} PaginationEditorRegistration
 */

/** @type {PaginationEditorRegistration|null} */
let registration = null;

/**
 * @param {PaginationEditorRegistration} entry
 */
export function registerPaginationEditor(entry) {
	if (!entry || typeof entry !== 'object') {
		return;
	}
	registration = { ...entry };
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('modulaPaginationRegistered'));
	}
}

/**
 * @returns {PaginationEditorRegistration|null}
 */
export function getPaginationEditorRegistration() {
	return registration;
}
