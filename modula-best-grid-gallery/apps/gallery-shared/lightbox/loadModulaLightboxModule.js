/**
 * Lazy-load Fancybox open pipeline + styles on first lightbox interaction.
 *
 * @package
 */

/** @type {Promise<typeof import('./openModulaLightbox')>|null} */
let modulePromise = null;

/**
 * @returns {Promise<typeof import('./openModulaLightbox')>}
 */
export function loadModulaLightboxModule() {
	if (!modulePromise) {
		modulePromise = Promise.all([
			import('./modulaLightboxStyles'),
			import('./openModulaLightbox'),
		]).then(([, mod]) => mod);
	}
	return modulePromise;
}
