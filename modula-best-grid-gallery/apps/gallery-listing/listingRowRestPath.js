/**
 * WordPress CPT REST path for a listing row.
 *
 * @param {{ type?: string, id?: number }} item
 * @return {string}
 */
export function listingRowRestPath(item) {
	const id = Number(item?.id);
	const type = item?.type === 'album' ? 'modula-album' : 'modula-gallery';
	return `/wp/v2/${type}/${id}`;
}
