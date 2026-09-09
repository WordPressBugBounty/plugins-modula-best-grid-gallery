/**
 * Exposes pagination platform hooks for Pro settings-editor-pagination bundle.
 */
import {
	getPaginationEditorRegistration,
	registerPaginationEditor,
} from './paginationRegistry';

/**
 * Attach registry API to `window.modula.pagination` (idempotent).
 */
export function exposePaginationPlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.pagination = window.modula.pagination || {
		register: registerPaginationEditor,
		getRegistration: getPaginationEditorRegistration,
	};
}
