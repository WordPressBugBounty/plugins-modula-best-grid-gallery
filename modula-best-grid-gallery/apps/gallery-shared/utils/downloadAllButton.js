/**
 * Gallery-level “Download all” button helpers (Pro download extension parity).
 *
 * @package
 */

/**
 * @param {*} value
 * @returns {boolean}
 */
export function isDownloadToggleOn(value) {
	if (value === true || value === 1 || value === '1') {
		return true;
	}
	if (typeof value === 'string' && value.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * @param {number|string|undefined|null} galleryId
 * @param {boolean} [editorPreview]
 * @returns {string}
 */
export function buildDownloadAllUrl(galleryId, editorPreview = false) {
	if (editorPreview) {
		return '#';
	}
	if (
		typeof window === 'undefined' ||
		galleryId == null ||
		galleryId === ''
	) {
		return '#';
	}
	try {
		const url = new URL(window.location.href);
		url.searchParams.set('modula-id', String(galleryId));
		return url.toString();
	} catch {
		return '#';
	}
}

/**
 * @param {Object|null|undefined} settings Grouped v2 settings.
 * @returns {boolean}
 */
export function shouldShowDownloadAllGalleryButton(settings) {
	const type = String(settings?.general?.type || '').trim();
	if (type === 'video') {
		return false;
	}
	const download = settings?.download || {};
	return (
		isDownloadToggleOn(download.enableDownload) &&
		isDownloadToggleOn(download.downloadAllGalleryButton)
	);
}

/**
 * @param {string|undefined|null} position
 * @param {'above'|'below'} placement
 * @returns {boolean}
 */
export function shouldRenderDownloadAllAtPlacement(position, placement) {
	const normalized =
		typeof position === 'string' && position.trim() !== ''
			? position.trim()
			: 'below_gallery';
	if (placement === 'above') {
		return (
			normalized === 'above_gallery' ||
			normalized === 'above_below_gallery'
		);
	}
	return (
		normalized === 'below_gallery' || normalized === 'above_below_gallery'
	);
}

/**
 * @param {string|undefined|null} hposition
 * @returns {'left'|'center'|'right'}
 */
export function resolveDownloadAllHposition(hposition) {
	if (
		hposition === 'left' ||
		hposition === 'right' ||
		hposition === 'center'
	) {
		return hposition;
	}
	return 'center';
}
