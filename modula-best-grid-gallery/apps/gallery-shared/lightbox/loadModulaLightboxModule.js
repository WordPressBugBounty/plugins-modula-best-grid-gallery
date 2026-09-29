/**
 * Lazy-load Fancybox open pipeline + styles on first lightbox interaction.
 *
 * @package
 */

/** @type {Promise<typeof import('./openModulaLightbox')>|null} */
let modulePromise = null;
let loadedModule = null;

export function getLoadedModulaLightboxModule() {
	return loadedModule;
}

/**
 * @returns {Promise<typeof import('./openModulaLightbox')>}
 */
export function loadModulaLightboxModule() {
	if (!modulePromise) {
		modulePromise = Promise.all([
			import(
				/* webpackChunkName: "modula-lightbox-styles" */ './modulaLightboxStyles'
			),
			import(
				/* webpackChunkName: "modula-lightbox-session" */ './openModulaLightbox'
			),
		])
			.then(([, mod]) => {
				loadedModule = mod;
				return mod;
			})
			.catch((error) => {
				modulePromise = null;
				throw error;
			});
	}
	return modulePromise;
}
