/**
 * Lightbox open facade — session (open / close / active / preview patch).
 *
 * Import from the synchronous editor preview adapter and session tests.
 * Visitor bind/open-at-root and bootstrap teardown stay on
 * `lightboxOpenFacade.js`.
 *
 * @package
 */

export {
	openModulaLightbox,
	closeModulaLightbox,
	isModulaLightboxActiveForGalleryElement,
	getModulaLightboxPreviewInstance,
	applyModulaLightboxPreviewPatch,
} from './openModulaLightbox';
