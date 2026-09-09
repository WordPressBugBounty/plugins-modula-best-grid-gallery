/**
 * Lightbox open facade — modern (beta) public surface.
 *
 * Bind on a gallery host, open at an index or root, and the React bind hook.
 * Open/close/patch for hosts that already load the Fancybox pipeline live in
 * `lightboxOpenFacade.session.js` so the visitor gallery can import this file
 * without pulling `@fancyapps/ui` into the main chunk.
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
