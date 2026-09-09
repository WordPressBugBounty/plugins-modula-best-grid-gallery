/**
 * Lazy-load Vimeo Player SDK (singleton).
 *
 * @package
 */

/** @type {Promise<typeof window.Vimeo>|null} */
let vimeoApiPromise = null;

/**
 * @return {Promise<typeof window.Vimeo>}
 */
export function loadVimeoPlayerApi() {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Vimeo API requires a browser.'));
	}
	if (window.Vimeo && window.Vimeo.Player) {
		return Promise.resolve(window.Vimeo);
	}
	if (vimeoApiPromise) {
		return vimeoApiPromise;
	}

	vimeoApiPromise = new Promise((resolve, reject) => {
		const existing = document.querySelector(
			'script[src*="player.vimeo.com/api/player.js"]'
		);
		if (existing) {
			const poll = () => {
				if (window.Vimeo && window.Vimeo.Player) {
					resolve(window.Vimeo);
				} else {
					window.setTimeout(poll, 50);
				}
			};
			poll();
			return;
		}

		const tag = document.createElement('script');
		tag.src = 'https://player.vimeo.com/api/player.js';
		tag.async = true;
		tag.onload = () => {
			if (window.Vimeo && window.Vimeo.Player) {
				resolve(window.Vimeo);
			} else {
				vimeoApiPromise = null;
				reject(new Error('Vimeo Player API failed to initialize.'));
			}
		};
		tag.onerror = () => {
			vimeoApiPromise = null;
			reject(new Error('Failed to load Vimeo Player API.'));
		};
		document.head.appendChild(tag);
	});

	return vimeoApiPromise;
}
