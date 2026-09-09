/**
 * Exposes video platform hooks for Pro settings-editor-video bundle.
 */
import {
	getVideoEditorRegistration,
	registerVideoEditor,
} from './videoRegistry';

/**
 * Attach registry API to `window.modula.video` (idempotent).
 */
export function exposeVideoPlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.video = window.modula.video || {
		register: registerVideoEditor,
		getRegistration: getVideoEditorRegistration,
	};
}
