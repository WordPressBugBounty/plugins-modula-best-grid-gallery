/**
 * Registry for watermark settings-editor UI (Pro registers at runtime).
 */

/** @typedef {import('react').ComponentType<Record<string, unknown>>} WatermarkSlotComponent */

/**
 * @typedef {{
 *   ActionButton?: WatermarkSlotComponent,
 * }} WatermarkEditorRegistration
 */

/** @type {WatermarkEditorRegistration|null} */
let registration = null;

/**
 * @param {WatermarkEditorRegistration} entry
 */
export function registerWatermarkEditor(entry) {
	if (!entry || typeof entry !== 'object') {
		return;
	}
	registration = { ...entry };
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('modulaWatermarkRegistered'));
	}
}

/**
 * @returns {WatermarkEditorRegistration|null}
 */
export function getWatermarkEditorRegistration() {
	return registration;
}
