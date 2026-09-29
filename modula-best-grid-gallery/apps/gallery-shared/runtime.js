/**
 * Public visitor-gallery surface for `gallery-shared`.
 * Import from `gallery-shared/runtime` in frontend-gallery (and shared bootstrap paths).
 *
 * @package
 */

export { default as Gallery } from './components/Gallery';
export { default as GalleryErrorBoundary } from './components/GalleryErrorBoundary';
export { createGalleryStore } from './store';
export * from './utils/data-loader';
export * from './utils/preloadState';
export { settingsToConfig } from './utils/settingsToConfig';
export { getLayoutLoader, resolveGalleryLayoutType } from './layouts';
export * from './utils/fetchGalleryBootstrap';
export * from './utils/galleryBootstrapContext';
export {
	closeModulaLightbox,
	isModulaLightboxActiveForGalleryElement,
	cancelModulaGalleryLightboxOpen,
} from './lightbox/lightboxOpenFacade';
export * from './lightbox/modulaDeeplinkFromHash';
export * from './utils/visitorRootClassification';
