/**
 * Settings-editor lightbox preview — thin wrapper over gallery-shared vanilla runtime.
 *
 * @package
 */
import {
	applyModulaLightboxPreviewPatch as patchModulaLightboxPreview,
	closeModulaLightbox,
	getModulaLightboxPreviewInstance as getSharedLightboxPreviewInstance,
	openModulaLightbox,
} from 'gallery-shared/preview';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

/**
 * @param {Array<{ src?: string, caption?: string, thumb?: string, opts?: object }>} links
 * @param {object} lightboxOpts
 * @param {number} index
 * @returns {unknown}
 */
export function openModulaLightboxPreview(links, lightboxOpts, index) {
	const shareButtons = getModulaSettingsEditorConfig().lightboxShareButtons;
	const shareButtonsJson =
		shareButtons && typeof shareButtons === 'object'
			? JSON.stringify(shareButtons)
			: '';

	return openModulaLightbox(links, lightboxOpts, index, {
		editorPreview: true,
		previewBackgroundColor:
			typeof lightboxOpts.previewBackgroundColor === 'string'
				? lightboxOpts.previewBackgroundColor.trim()
				: '',
		previewViewport: lightboxOpts.previewViewport || 'desktop',
		isMobile: lightboxOpts.previewViewport === 'mobile',
		compactToolbar: lightboxOpts.previewViewport !== 'desktop',
		shareButtonsJson,
	});
}

export function getModulaLightboxPreviewInstance() {
	return getSharedLightboxPreviewInstance();
}

/**
 * Current carousel page before close/reopen (editor preview only).
 *
 * @returns {number}
 */
export function getModulaLightboxPreviewSlideIndex() {
	const instance = getSharedLightboxPreviewInstance();
	const index = instance?.getCarousel?.()?.getPageIndex?.();
	return typeof index === 'number' && index >= 0 ? index : 0;
}

/**
 * @param {object} args
 * @param {object} args.lightboxOpts
 * @param {string} [args.previewBackgroundColor]
 * @param {'desktop'|'tablet'|'mobile'} [args.previewViewport]
 * @returns {boolean}
 */
export function applyModulaLightboxPreviewPatch({
	lightboxOpts,
	previewBackgroundColor,
	previewViewport,
	slideCount,
}) {
	const instance = getSharedLightboxPreviewInstance();
	if (!instance) {
		return false;
	}

	const shareButtons = getModulaSettingsEditorConfig().lightboxShareButtons;
	const shareButtonsJson =
		shareButtons && typeof shareButtons === 'object'
			? JSON.stringify(shareButtons)
			: '';

	return patchModulaLightboxPreview(instance, lightboxOpts, {
		editorPreview: true,
		previewBackgroundColor,
		previewViewport,
		isMobile: previewViewport === 'mobile',
		compactToolbar: previewViewport !== 'desktop',
		shareButtonsJson,
		slideCount,
	});
}

export function closeModulaLightboxPreview() {
	closeModulaLightbox();
}
