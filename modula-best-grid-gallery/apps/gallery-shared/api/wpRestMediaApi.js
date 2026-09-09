/**
 * WordPress REST media reads for gallery-shared (apiFetch only — no legacy Modula AJAX).
 *
 * @package
 */

import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';

/**
 * @param {number} attachmentId
 * @return {Promise<string>}
 */
export async function fetchWpMediaSourceUrl(attachmentId) {
	const id = parseInt(attachmentId, 10);
	if (!Number.isFinite(id) || id <= 0) {
		return '';
	}

	try {
		/** @type {{ source_url?: string }} */
		const data = await apiFetch({
			path: addQueryArgs(`/wp/v2/media/${id}`, {
				_fields: 'source_url',
			}),
		});
		return typeof data?.source_url === 'string'
			? data.source_url.trim()
			: '';
	} catch {
		return '';
	}
}
