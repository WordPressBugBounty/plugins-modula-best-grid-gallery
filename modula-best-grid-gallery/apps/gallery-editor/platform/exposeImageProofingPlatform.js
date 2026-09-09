/**
 * Exposes image-proofing platform hooks for Pro settings-editor-proofing bundle.
 */
import { useProofingMode } from '../context/ProofingModeContext';
import {
	getImageProofingEditorRegistration,
	registerImageProofingEditor,
} from './imageProofingRegistry';

/**
 * Attach registry API to `window.modula.imageProofing` (idempotent).
 */
export function exposeImageProofingPlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.imageProofing = window.modula.imageProofing || {
		register: registerImageProofingEditor,
		getRegistration: getImageProofingEditorRegistration,
		useProofingMode,
	};
}
