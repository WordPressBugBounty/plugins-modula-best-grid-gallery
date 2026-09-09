/**
 * Mark image tiles as loaded for loading-effect CSS (React parity with legacy tg-loaded).
 *
 * @package
 */

const IMAGE_TILE_SELECTOR = '.modula-item:not(.modula-item--embedded)';

/**
 * Only the full-resolution tile image should trigger loading-effect CSS — not LQIP placeholders.
 *
 * @param {HTMLImageElement|null|undefined} imgEl
 * @returns {boolean}
 */
export function isGalleryTileMainImage(imgEl) {
	if (!(imgEl instanceof HTMLImageElement)) {
		return false;
	}
	if (imgEl.classList.contains('modula-item-picture--placeholder')) {
		return false;
	}
	if (imgEl.closest('.modula-item-picture-stack picture')) {
		return true;
	}
	// Legacy PHP markup: img.pic lives inside .modula-item-content (no picture-stack).
	return (
		imgEl.classList.contains('pic') &&
		!!imgEl.closest(`${IMAGE_TILE_SELECTOR} .modula-item-content`)
	);
}

/**
 * @param {HTMLImageElement|null|undefined} imgEl
 */
export function markGalleryItemImageLoaded(imgEl) {
	if (!imgEl || !isGalleryTileMainImage(imgEl)) {
		return;
	}
	const item = imgEl.closest(IMAGE_TILE_SELECTOR);
	if (!item) {
		return;
	}
	item.classList.add('tg-loaded');
	const picture = imgEl.closest('picture');
	if (picture) {
		picture.classList.add('tg-loaded');
	}
}

/**
 * Bind load + already-complete (cache) handling for a gallery tile image.
 *
 * @param {HTMLImageElement|null|undefined} imgEl
 * @return {() => void}
 */
export function bindGalleryItemImageLoaded(imgEl) {
	if (!imgEl || !isGalleryTileMainImage(imgEl)) {
		return () => {};
	}

	const onLoad = () => {
		markGalleryItemImageLoaded(imgEl);
	};

	if (imgEl.complete && imgEl.naturalWidth > 0) {
		markGalleryItemImageLoaded(imgEl);
		return () => {};
	}

	imgEl.addEventListener('load', onLoad);
	return () => {
		imgEl.removeEventListener('load', onLoad);
	};
}
