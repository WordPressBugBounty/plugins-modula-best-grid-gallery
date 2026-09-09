/**
 * Update gallery post via WP REST (`modula-gallery` CPT, `show_in_rest`).
 */
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {number} galleryId
 * @param {{ title?: string, status?: string }} patch
 * @return {Promise<Record<string, unknown>>}
 */
export function patchModulaGalleryPost(galleryId, patch) {
	if (!galleryId) {
		return Promise.reject(new Error('Missing gallery id'));
	}
	const data = {};
	if (typeof patch.title === 'string') {
		data.title = patch.title;
	}
	if (typeof patch.status === 'string') {
		data.status = patch.status;
	}
	if (Object.keys(data).length === 0) {
		return Promise.reject(new Error('Nothing to patch'));
	}
	return apiFetch({
		path: `/wp/v2/modula-gallery/${galleryId}`,
		method: 'PUT',
		data,
	});
}
