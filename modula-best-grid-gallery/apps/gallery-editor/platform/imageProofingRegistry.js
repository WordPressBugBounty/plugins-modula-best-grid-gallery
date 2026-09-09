/**
 * Registry for image-proofing settings-editor UI (Pro registers at runtime).
 */

/** @typedef {import('react').ComponentType<Record<string, unknown>>} ProofingSlotComponent */

/**
 * @typedef {{
 *   setProofingGalleryLock?: (galleryId: number, lock: boolean) => Promise<{ updated?: boolean }>,
 * }} ImageProofingApi
 */

/**
 * @typedef {{
 *   TakeoverShell?: ProofingSlotComponent,
 *   api?: ImageProofingApi,
 * }} ImageProofingEditorRegistration
 */

/** @type {ImageProofingEditorRegistration|null} */
let registration = null;

/**
 * @param {ImageProofingEditorRegistration} entry
 */
export function registerImageProofingEditor(entry) {
	if (!entry || typeof entry !== 'object') {
		return;
	}
	registration = { ...entry };
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('modulaImageProofingRegistered'));
	}
}

/**
 * @returns {ImageProofingEditorRegistration|null}
 */
export function getImageProofingEditorRegistration() {
	return registration;
}
