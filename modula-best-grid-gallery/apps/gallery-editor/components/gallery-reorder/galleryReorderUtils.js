/**
 * @param {string}                  url
 * @param {Record<string, unknown>} row
 * @return {string}
 */
export function pickGalleryReorderThumb(url, row) {
	if (row.video_thumbnail && typeof row.video_thumbnail === 'string') {
		return row.video_thumbnail;
	}
	if (row.thumbnail && typeof row.thumbnail === 'string') {
		return row.thumbnail;
	}
	if (
		row.imgAttributes &&
		typeof row.imgAttributes === 'object' &&
		row.imgAttributes.src
	) {
		return String(row.imgAttributes.src);
	}
	return url || '';
}
