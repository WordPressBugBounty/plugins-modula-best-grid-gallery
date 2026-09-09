/**
 * Live preview Redux store lives under a Provider in the preview column only.
 * Sidebar (e.g. gallery type) needs read/write access for coordinated clears.
 */

/** @type {import('@reduxjs/toolkit').Store|null} */
let galleryPreviewReduxStore = null;

/**
 * @param {import('@reduxjs/toolkit').Store|null} next
 */
export function setGalleryPreviewReduxStore(next) {
	galleryPreviewReduxStore = next;
}

/**
 * @return {import('@reduxjs/toolkit').Store|null}
 */
export function getGalleryPreviewReduxStore() {
	return galleryPreviewReduxStore;
}
