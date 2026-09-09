import apiFetch from '@wordpress/api-fetch';

/**
 * @param {number} galleryId
 * @param {string} userPrompt
 */
export function generateGalleryCustomCssRequest(galleryId, userPrompt) {
	return apiFetch({
		path: `modula/v2/gallery/${galleryId}/generate-custom-css`,
		method: 'POST',
		data: {
			userPrompt,
		},
	});
}
