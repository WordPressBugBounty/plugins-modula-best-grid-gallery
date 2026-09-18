/**
 * Polaroid chin metrics when captions/titles render below the image.
 *
 * @package
 */

/** Minimum chin height so 2 caption lines + inset padding fit without clipping. */
export const POLAROID_CHIN_MIN_HEIGHT = 44;

const LINE_HEIGHT = 1.25;
const LINE_GAP = 1;

/**
 * @param {unknown} value
 * @param {number}  fallback
 * @return {number}
 */
function parsePx(value, fallback) {
	const n = parseInt(value, 10);
	return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {unknown} size
 * @return {number}
 */
export function resolvePolaroidChinTitleSize(size) {
	const n = parsePx(size, 0);
	return n > 0 ? Math.min(72, n) : 12;
}

/**
 * @param {unknown} size
 * @return {number}
 */
export function resolvePolaroidChinCaptionSize(size) {
	const n = parsePx(size, 0);
	return n > 0 ? Math.min(72, n) : 12;
}

/**
 * Horizontal / bottom inset for chin text.
 * Prefer captions.belowImagePadding when > 0; else frame-derived (0 = “use frame”).
 *
 * @param {number}  framePadding
 * @param {unknown} [belowImagePadding]
 * @return {number}
 */
export function resolvePolaroidChinInset(framePadding, belowImagePadding) {
	const authored = parsePx(belowImagePadding, NaN);
	if (Number.isFinite(authored) && authored > 0) {
		return Math.max(1, Math.min(48, authored));
	}
	const pad = Math.max(4, parsePx(framePadding, 12));
	return Math.max(6, Math.min(10, Math.round(pad * 0.65)));
}

/**
 * Top gap inside the chin (between photo and text).
 *
 * @param {unknown} [belowImageSpacing]
 * @return {number}
 */
export function resolvePolaroidChinTopSpacing(belowImageSpacing) {
	if (belowImageSpacing === undefined || belowImageSpacing === null) {
		return 4;
	}
	const n = parsePx(belowImageSpacing, NaN);
	if (!Number.isFinite(n)) {
		return 4;
	}
	return Math.max(0, Math.min(48, n));
}

/**
 * @param {{
 *   topSpacing?: number,
 *   inset?: number,
 *   titleFontSize?: number,
 *   captionFontSize?: number,
 * }} [options]
 * @return {number}
 */
function resolvePolaroidContentMinHeight(options = {}) {
	const top = Math.max(0, parsePx(options.topSpacing, 4));
	const inset = Math.max(0, parsePx(options.inset, 8));
	const title = resolvePolaroidChinTitleSize(options.titleFontSize);
	const caption = resolvePolaroidChinCaptionSize(options.captionFontSize);
	return Math.ceil(
		top +
			inset +
			title * LINE_HEIGHT +
			LINE_GAP +
			caption * LINE_HEIGHT
	);
}

/**
 * @param {number} chinHeight User setting (px).
 * @param {{
 *   topSpacing?: number,
 *   inset?: number,
 *   titleFontSize?: number,
 *   captionFontSize?: number,
 * }} [options]
 * @return {number}
 */
export function resolvePolaroidEffectiveChinHeight(chinHeight, options = {}) {
	const configured = Math.min(
		80,
		Math.max(12, parsePx(chinHeight, 36))
	);
	const contentMin = resolvePolaroidContentMinHeight(options);
	return Math.max(configured, contentMin, POLAROID_CHIN_MIN_HEIGHT);
}
