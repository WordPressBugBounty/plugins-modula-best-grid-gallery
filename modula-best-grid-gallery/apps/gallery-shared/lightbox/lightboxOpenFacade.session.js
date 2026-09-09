/**
 * Lightbox open facade — session (open / close / active / preview patch).
 *
 * Import from hosts that open or tear down the Fancybox pipeline (bootstrap,
 * editor adapter, tests). Visitor bind/open-at-root stays on
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
