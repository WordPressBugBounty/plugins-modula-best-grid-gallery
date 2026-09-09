/**
 * Mark image tiles loaded for loading-effect CSS (React, no jQuery).
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import {
	bindGalleryItemImageLoaded,
	isGalleryTileMainImage,
	markGalleryItemImageLoaded,
} from '../utils/galleryItemImageLoaded';

const IMAGE_TILE_IMG_SELECTOR =
	'.modula-item:not(.modula-item--embedded) .modula-item-picture-stack picture img, .modula-item:not(.modula-item--embedded):not(:has(.modula-item-picture-stack)) .modula-item-content img.pic';

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {boolean} enabled
 */
export function useGalleryImageLoaded(hostRef, enabled) {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}

		const root =
			hostRef.current?.closest('.modula-gallery-react-host')
				?.parentElement ??
			hostRef.current?.closest('.modula.modula-gallery');
		if (!root) {
			return undefined;
		}

		const boundImages = new WeakSet();

		const bindImage = (img) => {
			if (!(img instanceof HTMLImageElement) || boundImages.has(img)) {
				return;
			}
			boundImages.add(img);
			bindGalleryItemImageLoaded(img);
		};

		const scanImages = () => {
			root.querySelectorAll(IMAGE_TILE_IMG_SELECTOR).forEach(bindImage);
		};

		scanImages();

		const observer = new MutationObserver(() => {
			scanImages();
		});

		observer.observe(root, {
			childList: true,
			subtree: true,
		});

		const onLoadCapture = (event) => {
			const target = event.target;
			if (isGalleryTileMainImage(target)) {
				markGalleryItemImageLoaded(target);
			}
		};

		root.addEventListener('load', onLoadCapture, true);

		return () => {
			observer.disconnect();
			root.removeEventListener('load', onLoadCapture, true);
		};
	}, [hostRef, enabled]);
}
