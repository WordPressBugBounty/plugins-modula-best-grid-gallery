/**
 * Pending visitor opens and synchronous teardown without importing Fancybox.
 * The first action owns the session until its preparation and loading finish.
 *
 * @package
 */
import {
	getLoadedModulaLightboxModule,
	loadModulaLightboxModule,
} from './loadModulaLightboxModule';
import {
	clearLightboxFailureNotice,
	reportLightboxFailure,
} from './reportLightboxFailure';

let pendingOpen = null;

function galleryRoot(host) {
	return host?.closest('.modula.modula-gallery') || host;
}

function clearRequest() {
	if (pendingOpen) {
		clearLightboxFailureNotice(galleryRoot(pendingOpen.host));
		pendingOpen = null;
	}
}

/** @param {HTMLElement} host Gallery root or descendant binding host. */
export function cancelModulaGalleryLightboxOpen(host) {
	if (
		host &&
		pendingOpen &&
		(galleryRoot(host) === galleryRoot(pendingOpen.host) ||
			host.contains(pendingOpen.host))
	) {
		clearRequest();
	}
}

export function closeModulaLightbox() {
	clearRequest();
	getLoadedModulaLightboxModule()?.closeModulaLightbox();
}

export function isModulaLightboxActiveForGalleryElement(host) {
	return (
		getLoadedModulaLightboxModule()?.isModulaLightboxActiveForGalleryElement(
			host
		) || false
	);
}

/**
 * @param {HTMLElement} host
 * @param {() => Promise<Array|null>} prepare Arguments for the session open.
 * @returns {Promise<boolean>}
 */
export function requestModulaLightboxOpen(host, prepare) {
	if (pendingOpen && !pendingOpen.failed) {
		return pendingOpen.promise;
	}
	clearRequest();
	const request = { host, promise: null, failed: false };
	pendingOpen = request;
	request.promise = (async () => {
		try {
			const args = await prepare();
			if (!args || pendingOpen !== request || !host.isConnected) {
				return false;
			}
			// Pro installs a lightweight loader; await it before the first slide events.
			const [session] = await Promise.all([
				loadModulaLightboxModule(),
				(args[3]?.galleryComments || args[1]?.galleryComments) &&
					window.modulaLoadGalleryComments?.(),
			]);
			if (pendingOpen !== request || !host.isConnected) {
				return false;
			}
			session.openModulaLightbox(...args);
			return true;
		} catch (error) {
			if (pendingOpen === request && host.isConnected) {
				request.failed = true;
				reportLightboxFailure(host, error, () => {
					if (pendingOpen === request && host.isConnected) {
						void requestModulaLightboxOpen(host, prepare);
					}
				});
			}
			return false;
		} finally {
			if (pendingOpen === request && !request.failed) {
				clearRequest();
			}
		}
	})();
	return request.promise;
}
