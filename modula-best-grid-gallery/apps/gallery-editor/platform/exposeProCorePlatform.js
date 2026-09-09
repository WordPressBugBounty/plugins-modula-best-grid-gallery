/**
 * Exposes pro-core platform hooks for Pro settings-editor-pro-core bundle.
 */
import {
	getProCoreEditorRegistration,
	registerProCoreEditor,
} from './proCoreRegistry';

/**
 * Attach registry API to `window.modula.proCore` (idempotent).
 */
export function exposeProCorePlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.proCore = window.modula.proCore || {
		register: registerProCoreEditor,
		getRegistration: getProCoreEditorRegistration,
	};
}
