/**
 * Lightbox open facade — modern (beta) public surface.
 *
 * Bind on a gallery host, open at an index or root, and the React bind hook.
 * Synchronous open/patch for hosts that already load the Fancybox pipeline live in
 * `lightboxOpenFacade.session.js` so the visitor gallery can import this file
 * without pulling `@fancyapps/ui` into the main chunk. Close/active queries
 * below consult only an already loaded session; cancellation also covers opens
 * still waiting for their catalog or chunks.
 *
 * Legacy jQuery Fancybox is a separate stack.
 *
 * @package
 */

export {
	bindModulaGalleryLightbox,
	openModulaGalleryLightboxAtRoot,
} from './modulaGalleryLightbox';

export { useModulaGalleryLightbox } from './useModulaGalleryLightbox';
export {
	closeModulaLightbox,
	isModulaLightboxActiveForGalleryElement,
	cancelModulaGalleryLightboxOpen,
} from './lightboxSessionLifecycle';
