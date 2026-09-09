/**
 * Resolve the gallery root selector used by dynamic CSS (#modula-{id}).
 *
 * @package
 */

/**
 * @param {number|string|null|undefined} galleryId
 * @return {string}
 */
export function normalizeGalleryDomId(galleryId) {
	if (galleryId === null || galleryId === undefined || galleryId === '') {
		return '';
	}
	const raw = String(galleryId).trim();
	if (!raw) {
		return '';
	}
	return raw.replace(/^modula-/, '');
}

/**
 * @param {number|string|null|undefined} galleryId
 * @return {string}
 */
export function galleryRootSelector(galleryId) {
	const id = normalizeGalleryDomId(galleryId);
	return id ? `#modula-${id}` : '';
}
