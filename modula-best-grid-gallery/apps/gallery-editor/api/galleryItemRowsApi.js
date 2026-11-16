/**
 * REST client: modula/v2/gallery/{id}/item-rows. The server builds the rows
 * given attachments join the gallery with and stores nothing (explicit-save
 * ticket 11); the editor puts them in the store as unsaved changes.
 */
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

/** The route's per-request limit (`Gallery_Upload_Controller::MAX_ITEM_ROW_IDS`). */
const MAX_IDS_PER_REQUEST = 50;

/**
 * @typedef {{ row: Record<string, unknown>, item: Record<string, unknown> }} GalleryItemRowsEntry
 * `row` is what the gallery stores; `item` is that row as the editor bootstrap shows it.
 * @typedef {{ type?: string, columns?: number }} GalleryTileLayout The editor's working layout.
 */

/**
 * @param {GalleryTileLayout} layout
 * @return {Record<string, string|number>} The layout values the route accepts.
 */
function layoutQueryArgs(layout) {
	const args = {};
	if (typeof layout?.type === 'string' && /^[a-z0-9-]+$/.test(layout.type)) {
		args.type = layout.type;
	}
	const columns = Number(layout?.columns);
	if (Number.isInteger(columns) && columns >= 1 && columns <= 12) {
		args.columns = columns;
	}
	return args;
}

/**
 * @param {number}            galleryId
 * @param {number[]}          ids       Attachment ids, in order.
 * @param {GalleryTileLayout} layout
 * @return {Promise<GalleryItemRowsEntry[]>} One entry per attachment, in order.
 */
export async function fetchGalleryItemRows(galleryId, ids, layout) {
	const id = Number(galleryId);
	if (!id) {
		throw new Error('Invalid gallery ID');
	}
	const query = layoutQueryArgs(layout);
	const entries = [];
	// One batch at a time: the order of the answers is the order of the ids.
	for (let start = 0; start < ids.length; start += MAX_IDS_PER_REQUEST) {
		const batch = ids.slice(start, start + MAX_IDS_PER_REQUEST);
		const response = await apiFetch({
			path: addQueryArgs(`modula/v2/gallery/${id}/item-rows`, {
				...query,
				ids: batch,
			}),
			method: 'GET',
		});
		// An answer without rows is a failure, not an empty pick.
		if (!Array.isArray(response?.images)) {
			throw new Error(
				__(
					'The server did not return the gallery rows.',
					'modula-best-grid-gallery'
				)
			);
		}
		entries.push(...response.images);
	}
	return entries;
}
