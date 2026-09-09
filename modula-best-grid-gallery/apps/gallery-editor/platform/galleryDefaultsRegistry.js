/**
 * Registry for gallery defaults editor UI (Pro registers at runtime).
 */

/** @typedef {import('react').ComponentType<Record<string, unknown>>} DefaultsSlotComponent */

/**
 * @typedef {{
 *   Root?: DefaultsSlotComponent,
 *   AdvancedPanel?: DefaultsSlotComponent,
 * }} GalleryDefaultsEditorRegistration
 */

/** @type {GalleryDefaultsEditorRegistration|null} */
let registration = null;

/**
 * @param {GalleryDefaultsEditorRegistration} entry
 */
export function registerGalleryDefaultsEditor(entry) {
	if (!entry || typeof entry !== 'object') {
		return;
	}
	registration = { ...entry };
	if (typeof window !== 'undefined') {
		window.dispatchEvent(
			new CustomEvent('modulaGalleryDefaultsRegistered')
		);
	}
}

/**
 * @returns {GalleryDefaultsEditorRegistration|null}
 */
export function getGalleryDefaultsEditorRegistration() {
	return registration;
}
