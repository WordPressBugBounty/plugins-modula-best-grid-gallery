/**
 * Exposes watermark platform hooks for Pro settings-editor-watermark bundle.
 */
import {
	getWatermarkEditorRegistration,
	registerWatermarkEditor,
} from './watermarkRegistry';

/**
 * Attach registry API to `window.modula.watermark` (idempotent).
 */
export function exposeWatermarkPlatform() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.watermark = window.modula.watermark || {
		register: registerWatermarkEditor,
		getRegistration: getWatermarkEditorRegistration,
	};
}
