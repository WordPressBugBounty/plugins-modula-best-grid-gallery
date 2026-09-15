/**
 * Live preview Redux store lives under a Provider in the preview column only.
 * Sidebar (e.g. gallery type) needs read/write access for coordinated clears.
 */

/** @type {import('@reduxjs/toolkit').Store|null} */
let galleryPreviewReduxStore = null;

/** @type {Set<() => void>} */
const galleryPreviewReduxStoreListeners = new Set();

/**
 * @param {import('@reduxjs/toolkit').Store|null} next
 */
export function setGalleryPreviewReduxStore(next) {
	galleryPreviewReduxStore = next;
	galleryPreviewReduxStoreListeners.forEach((listener) => {
		listener();
	});
}

/**
 * @return {import('@reduxjs/toolkit').Store|null}
 */
export function getGalleryPreviewReduxStore() {
	return galleryPreviewReduxStore;
}

/**
 * Notify when the module-level store ref is registered or cleared.
 * Status-bar / shell consumers mount before the preview Provider and need this.
 *
 * @param {() => void} listener
 * @return {() => void} Unsubscribe.
 */
export function subscribeGalleryPreviewReduxStore(listener) {
	galleryPreviewReduxStoreListeners.add(listener);
	return () => {
		galleryPreviewReduxStoreListeners.delete(listener);
	};
}
