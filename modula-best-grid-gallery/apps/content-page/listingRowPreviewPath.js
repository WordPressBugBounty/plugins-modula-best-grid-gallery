/**
 * REST path for a listing row preview payload.
 *
 * @param {{ type?: string, id?: number }} item
 * @return {string}
 */
export function listingRowPreviewPath(item) {
	const id = Number(item?.id);
	const type = item?.type === 'album' ? 'album' : 'gallery';
	return `/modula/v2/listing/${id}/preview?type=${type}`;
}

/**
 * Whether a listing row may show a hover preview.
 *
 * @param {{ status?: string, type?: string }} item
 * @return {boolean}
 */
export function canShowListingRowPreview(item) {
	if (!item || item.status === 'trash') {
		return false;
	}
	return item.type === 'gallery' || item.type === 'album';
}
