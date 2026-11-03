/**
 * Gallery-level “Download all” button helpers (Pro download extension parity).
 *
 * @package
 */

/**
 * @param {*} value
 * @return {boolean}
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
 * @param {boolean}                      [editorPreview]
 * @return {string}
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
 * The button prints while both the download extension and its “Download all”
 * toggle are on (galleries and albums share these keys).
 *
 * @param {Object|null|undefined} download Grouped `download.*` settings.
 * @return {boolean} Whether the button prints.
 */
export function shouldShowDownloadAllButton(download) {
	return (
		isDownloadToggleOn(download?.enableDownload) &&
		isDownloadToggleOn(download?.downloadAllGalleryButton)
	);
}

/**
 * @param {Object|null|undefined} settings Grouped v2 settings.
 * @return {boolean} Whether the gallery prints the button (never on video galleries).
 */
export function shouldShowDownloadAllGalleryButton(settings) {
	const type = String(settings?.general?.type || '').trim();
	if (type === 'video') {
		return false;
	}
	return shouldShowDownloadAllButton(settings?.download);
}

/**
 * @param {string|undefined|null} position
 * @param {'above'|'below'}       placement
 * @return {boolean}
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
 * @return {'left'|'center'|'right'}
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

/**
 * @param {unknown} value
 * @return {string} The trimmed string, or '' for anything else.
 */
function trimmedString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * @typedef {Object} DownloadAllButtonLook
 * @property {string}                  label           The label, or '' for the default label.
 * @property {boolean}                 showIcon        Whether the icon prints before the label.
 * @property {'left'|'center'|'right'} hposition       The row alignment.
 * @property {string}                  textColor       Text color, or '' to keep the theme's.
 * @property {string}                  backgroundColor Background, or '' to keep the theme's.
 * @property {string}                  iconColor       Icon fill, or '' to follow the text.
 */

/**
 * What the button looks like, from `download.*`. An empty color adds nothing,
 * as the extension's visitor CSS.
 *
 * @param {Object|null|undefined} download Grouped `download.*` settings.
 * @return {DownloadAllButtonLook} The button's label, icon, alignment and colors.
 */
export function resolveDownloadAllButtonLook(download) {
	return {
		label: trimmedString(download?.downloadAllLabel),
		showIcon: isDownloadToggleOn(download?.downloadAllGalleryButtonIcon),
		hposition: resolveDownloadAllHposition(download?.downloadAllHposition),
		textColor: trimmedString(download?.downloadAllColor),
		backgroundColor: trimmedString(download?.downloadAllBackgroundColor),
		iconColor: trimmedString(download?.downloadAllGalleryIconColor),
	};
}
