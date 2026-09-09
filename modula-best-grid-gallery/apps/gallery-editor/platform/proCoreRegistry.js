/**
 * Registry for Pro-core settings-editor UI (filters preview, folder/ZIP import).
 */

/** @typedef {import('react').ComponentType<Record<string, unknown>>} ProCoreSlotComponent */

/**
 * @typedef {{
 *   FiltersPreviewPanel?: ProCoreSlotComponent,
 *   FolderImportModal?: ProCoreSlotComponent,
 *   ZipImporter?: ProCoreSlotComponent,
 *   ZipImportModal?: ProCoreSlotComponent,
 * }} ProCoreEditorRegistration
 */

/** @type {ProCoreEditorRegistration|null} */
let registration = null;

/**
 * @param {ProCoreEditorRegistration} entry
 */
export function registerProCoreEditor(entry) {
	if (!entry || typeof entry !== 'object') {
		return;
	}
	registration = { ...registration, ...entry };
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('modulaProCoreRegistered'));
	}
}

/**
 * @returns {ProCoreEditorRegistration|null}
 */
export function getProCoreEditorRegistration() {
	return registration;
}
