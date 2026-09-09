/**
 * Exposes extension-import platform hooks for Phase C Pro bundles (runtime registration).
 * Pro scripts enqueue after settings-editor and call `window.modula.extensionImport.register(...)`.
 */
import {
	listExtensionImportEntries,
	registerExtensionImport,
	requestExtensionImportOpen,
} from './extensionImportRegistry';

/**
 * Attach registry API to `window.modula.extensionImport` (idempotent).
 */
export function exposeExtensionImportPlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.extensionImport = window.modula.extensionImport || {
		register: registerExtensionImport,
		list: listExtensionImportEntries,
		requestOpen: requestExtensionImportOpen,
	};
}
