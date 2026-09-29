const STYLESHEET_TIMEOUT_MS = 8000;
const stylesheetLoads = new WeakMap();

/**
 * Reuse the canonical bootstrap stylesheet and wait until it can paint.
 *
 * Webpack recognizes the queryless data-href when importing the bootstrap
 * chunk, but the actual href retains the build version used by WordPress.
 *
 * @param {string|undefined} url Versioned bootstrap stylesheet URL.
 * @returns {Promise<void>}
 */
export function loadGalleryStylesheet(url) {
	if (!url || typeof document === 'undefined') {
		return Promise.resolve();
	}

	let canonical;
	try {
		canonical = new URL(url, document.baseURI);
	} catch (error) {
		return Promise.reject(error);
	}
	const href = canonical.href;
	canonical.search = '';
	canonical.hash = '';
	const runtimeHref = canonical.href;
	const links = Array.from(document.getElementsByTagName('link'));

	// A link from another build must not advertise compatibility to webpack.
	for (const link of links) {
		if (
			link.href !== href &&
			link.getAttribute('data-href') === runtimeHref
		) {
			link.removeAttribute('data-href');
		}
	}

	let link = links.find(
		(candidate) => candidate.rel === 'stylesheet' && candidate.href === href
	);
	if (!link) {
		link = links.find(
			(candidate) =>
				candidate.rel === 'preload' &&
				candidate.as === 'style' &&
				candidate.href === href
		);
	}
	if (!link) {
		link = document.createElement('link');
		link.href = href;
	}
	link.setAttribute('data-href', runtimeHref);

	const existingLoad = stylesheetLoads.get(link);
	if (existingLoad) {
		return existingLoad;
	}

	const stylesheetLoad = new Promise((resolve, reject) => {
		const cleanup = () => {
			window.clearTimeout(timer);
			link.removeEventListener('load', onLoad);
			link.removeEventListener('error', onError);
		};
		const onLoad = () => {
			// A promoted preload can still dispatch its preload completion first.
			// sheet is also safe to read when the stylesheet is cross-origin.
			if (!link.sheet) {
				return;
			}
			cleanup();
			resolve();
		};
		const fail = (message) => {
			cleanup();
			stylesheetLoads.delete(link);
			link.remove();
			reject(new Error(message));
		};
		const onError = () => {
			fail(`Could not load gallery stylesheet: ${href}`);
		};

		link.addEventListener('load', onLoad);
		link.addEventListener('error', onError);
		const timer = window.setTimeout(() => {
			fail(`Gallery stylesheet loading timed out: ${href}`);
		}, STYLESHEET_TIMEOUT_MS);

		link.rel = 'stylesheet';
		if (!link.isConnected) {
			document.head.appendChild(link);
		}
		onLoad();
	});
	stylesheetLoads.set(link, stylesheetLoad);
	return stylesheetLoad;
}
