/**
 * Exposes gallery-defaults platform hooks for Pro settings-editor-defaults bundle.
 */
import {
	getDefaultsFieldLabel,
	getDefaultsGroupLabel,
	formatDefaultsFieldValue,
} from '../utils/defaultsFieldDisplay';
import {
	getGalleryDefaultsEditorRegistration,
	registerGalleryDefaultsEditor,
} from './galleryDefaultsRegistry';

/**
 * Attach registry API to `window.modula.galleryDefaults` (idempotent).
 */
export function exposeGalleryDefaultsPlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.galleryDefaults = window.modula.galleryDefaults || {
		register: registerGalleryDefaultsEditor,
		getRegistration: getGalleryDefaultsEditorRegistration,
		getGroupLabel: getDefaultsGroupLabel,
		getFieldLabel: getDefaultsFieldLabel,
		formatFieldValue: formatDefaultsFieldValue,
	};
}
