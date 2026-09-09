/**
 * Fetch full gallery bootstrap payload (GET modula/v2/gallery/{id}/bootstrap).
 * Same shape as shortcode inline JSON for use with buildPreloadedState().
 *
 * @param {number} galleryId          Gallery post ID.
 * @param {Object} [options]          Options.
 * @param {string} [options.align]    Shortcode align attribute.
 * @param {string} [options.restRoot] Override REST root (default: wpApiSettings.root or /wp-json/).
 * @return {Promise<Object>} Gallery data object.
 */
export async function fetchGalleryBootstrap(galleryId, options = {}) {
	const { align = '', restRoot } = options;
	let root =
		restRoot ||
		(typeof window !== 'undefined' && window.wpApiSettings?.root) ||
		'/wp-json/';
	root = String(root).replace(/\/?$/, '/');
	const q =
		String(align ?? '').trim() !== ''
			? `?align=${encodeURIComponent(String(align).trim())}`
			: '';
	const url = `${root}modula/v2/gallery/${galleryId}/bootstrap${q}`;
	const res = await fetch(url, { credentials: 'same-origin' });
	if (!res.ok) {
		let message = res.statusText;
		try {
			const errBody = await res.json();
			if (errBody?.message) {
				message = errBody.message;
			}
		} catch {
			// ignore
		}
		throw new Error(message || `HTTP ${res.status}`);
	}
	return res.json();
}
