import { countGalleryPhotos } from '../logic/liveGalleryPhotoCount';
import { usePreviewReduxStoreItems } from './usePreviewReduxStoreItems';

/**
 * Photos on the live canvas. Settings views that evaluate form rules call it
 * so a `galleryPhotoCount` rule re-runs when photos are added or removed.
 *
 * @return {number} Photos on the canvas (0 before the preview store registers).
 */
export function useLiveGalleryPhotoCount() {
	return countGalleryPhotos(usePreviewReduxStoreItems());
}
