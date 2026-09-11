/**
 * Update gallery post via WP REST (`modula-gallery` CPT, `show_in_rest`).
 *
 * Status / slug follow the listing row post document field contract.
 */
import apiFetch from '@wordpress/api-fetch';
import { buildGalleryPostDocumentPatch } from '../utils/editorPostDocument';

/**
 * @param {number} galleryId
 * @param {{ title?: string, status?: string, slug?: string }} patch
 * @return {Promise<Record<string, unknown>>}
 */
export function patchModulaGalleryPost(galleryId, patch) {
	if (!galleryId) {
		return Promise.reject(new Error('Missing gallery id'));
	}
	const data = buildGalleryPostDocumentPatch(patch);
	return apiFetch({
		path: `/wp/v2/modula-gallery/${galleryId}`,
		method: 'PUT',
		data,
	});
}
