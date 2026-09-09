/**
 * Exposes Instagram settings-editor platform for Pro registration.
 */
import {
	getInstagramConnectionState,
	getInstagramEditorRegistration,
	registerInstagramEditor,
	setInstagramConnectionState,
} from './instagramRegistry';

/**
 * Attach API to `window.modula.instagram` (idempotent).
 */
export function exposeInstagramPlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.instagram = window.modula.instagram || {
		register: registerInstagramEditor,
		getRegistration: getInstagramEditorRegistration,
		setConnectionState: setInstagramConnectionState,
		getConnectionState: getInstagramConnectionState,
	};
}
