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
 * `Modal` is the proofing manager (Summary and Invitations). The editor
 * mounts it while the gallery is locked and the manager is open; it closes
 * through `useProofingMode().closeManager` and stops proofing through
 * `unlock`.
 *
 * @typedef {{
 *   Modal?: ProofingSlotComponent,
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
 * @return {ImageProofingEditorRegistration|null}
 */
export function getImageProofingEditorRegistration() {
	return registration;
}
