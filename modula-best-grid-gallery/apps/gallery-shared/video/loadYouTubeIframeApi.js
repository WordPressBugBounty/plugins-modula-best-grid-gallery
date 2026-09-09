/**
 * Lazy-load YouTube IFrame Player API (singleton).
 *
 * @package
 */

/** @type {Promise<typeof window.YT>|null} */
let youtubeApiPromise = null;

/**
 * @return {Promise<typeof window.YT>}
 */
export function loadYouTubeIframeApi() {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('YouTube API requires a browser.'));
	}
	if (window.YT && window.YT.Player) {
		return Promise.resolve(window.YT);
	}
	if (youtubeApiPromise) {
		return youtubeApiPromise;
	}

	youtubeApiPromise = new Promise((resolve, reject) => {
		const existing = document.querySelector(
			'script[src*="youtube.com/iframe_api"]'
		);
		const previousReady = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			if (typeof previousReady === 'function') {
				previousReady();
			}
			if (window.YT && window.YT.Player) {
				resolve(window.YT);
			} else {
				reject(new Error('YouTube IFrame API failed to initialize.'));
			}
		};

		if (existing) {
			return;
		}

		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		tag.async = true;
		tag.onerror = () => {
			youtubeApiPromise = null;
			reject(new Error('Failed to load YouTube IFrame API.'));
		};
		document.head.appendChild(tag);
	});

	return youtubeApiPromise;
}
