/**
 * Detect when an absolute gallery width exceeds the live-preview artboard.
 */

/**
 * @param {string} cssWidth CSS width from previewGalleryWidthCss (e.g. "3000px", "100%").
 * @return {number|null} Pixel width, or null when relative / unparsable.
 */
export function parseAbsoluteGalleryWidthPx(cssWidth) {
	if (typeof cssWidth !== 'string') {
		return null;
	}
	const s = cssWidth.trim();
	if (!s) {
		return null;
	}
	const match = /^(\d+(?:\.\d+)?)px$/i.exec(s);
	if (!match) {
		return null;
	}
	const px = Number(match[1]);
	if (!Number.isFinite(px) || px <= 0) {
		return null;
	}
	return px;
}

/**
 * @param {string} cssWidth
 * @param {number} artboardInnerWidth Content-box width of the artboard (px).
 * @return {boolean}
 */
export function isGalleryWiderThanArtboard(cssWidth, artboardInnerWidth) {
	const galleryPx = parseAbsoluteGalleryWidthPx(cssWidth);
	if (galleryPx === null) {
		return false;
	}
	if (
		typeof artboardInnerWidth !== 'number' ||
		!Number.isFinite(artboardInnerWidth) ||
		artboardInnerWidth <= 0
	) {
		return false;
	}
	return galleryPx > artboardInnerWidth;
}
