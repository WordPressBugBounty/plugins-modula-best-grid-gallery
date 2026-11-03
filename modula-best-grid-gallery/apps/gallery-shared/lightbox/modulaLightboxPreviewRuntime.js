/**
 * Settings-editor lightbox preview — thin wrapper over the vanilla lightbox
 * runtime. Each editor passes its share buttons (from its own config).
 *
 * @package
 */
import {
	applyModulaLightboxPreviewPatch as patchModulaLightboxPreview,
	closeModulaLightbox,
	getModulaLightboxPreviewInstance as getSharedLightboxPreviewInstance,
	openModulaLightbox,
} from './lightboxOpenFacade.session';

/**
 * @param {unknown} shareButtons Share network buttons from the editor config.
 * @return {string} JSON for the share toolbar, or '' without buttons.
 */
function shareButtonsToJson(shareButtons) {
	return shareButtons && typeof shareButtons === 'object'
		? JSON.stringify(shareButtons)
		: '';
}

/**
 * @param {Array<{ src?: string, caption?: string, thumb?: string, opts?: object }>} links
 * @param {Object}                                                                   lightboxOpts
 * @param {number}                                                                   index
 * @param {Record<string, string>}                                                   [shareButtons] Network → share button HTML (`Modula_Helper::render_lightbox_share_template()`).
 * @return {unknown} The Fancybox instance.
 */
export function openModulaLightboxPreview(
	links,
	lightboxOpts,
	index,
	shareButtons
) {
	return openModulaLightbox(links, lightboxOpts, index, {
		editorPreview: true,
		previewBackgroundColor:
			typeof lightboxOpts.previewBackgroundColor === 'string'
				? lightboxOpts.previewBackgroundColor.trim()
				: '',
		previewViewport: lightboxOpts.previewViewport || 'desktop',
		isMobile: lightboxOpts.previewViewport === 'mobile',
		compactToolbar: lightboxOpts.previewViewport !== 'desktop',
		shareButtonsJson: shareButtonsToJson(shareButtons),
	});
}

export function getModulaLightboxPreviewInstance() {
	return getSharedLightboxPreviewInstance();
}

/**
 * Current carousel page before close/reopen (editor preview only).
 *
 * @return {number} The page index, 0 without a preview.
 */
export function getModulaLightboxPreviewSlideIndex() {
	const instance = getSharedLightboxPreviewInstance();
	const index = instance?.getCarousel?.()?.getPageIndex?.();
	return typeof index === 'number' && index >= 0 ? index : 0;
}

/**
 * @param {Object}                      args
 * @param {Object}                      args.lightboxOpts
 * @param {string}                      [args.previewBackgroundColor]
 * @param {'desktop'|'tablet'|'mobile'} [args.previewViewport]
 * @param {Record<string, string>}      [args.shareButtons]           Network → share button HTML (`Modula_Helper::render_lightbox_share_template()`).
 * @param {number}                      args.slideCount
 * @return {boolean} Whether the open preview took the options (false: reopen it).
 */
export function applyModulaLightboxPreviewPatch({
	lightboxOpts,
	previewBackgroundColor,
	previewViewport,
	shareButtons,
	slideCount,
}) {
	const instance = getSharedLightboxPreviewInstance();
	if (!instance) {
		return false;
	}

	return patchModulaLightboxPreview(instance, lightboxOpts, {
		editorPreview: true,
		previewBackgroundColor,
		previewViewport,
		isMobile: previewViewport === 'mobile',
		compactToolbar: previewViewport !== 'desktop',
		shareButtonsJson: shareButtonsToJson(shareButtons),
		slideCount,
	});
}

export function closeModulaLightboxPreview() {
	closeModulaLightbox();
}
