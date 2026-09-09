/**
 * Polaroid chin metrics when captions/titles render below the image.
 *
 * @package
 */

/** Minimum chin height so 2 caption lines + inset padding fit without clipping. */
export const POLAROID_CHIN_MIN_HEIGHT = 44;

/**
 * @param {number} framePadding
 * @return {number}
 */
export function resolvePolaroidChinInset(framePadding) {
	const pad = Math.max(4, parseInt(framePadding, 10) || 12);
	return Math.max(6, Math.min(10, Math.round(pad * 0.65)));
}

/**
 * @param {number} chinHeight User setting (px).
 * @return {number}
 */
export function resolvePolaroidEffectiveChinHeight(chinHeight) {
	const configured = Math.min(
		80,
		Math.max(12, parseInt(chinHeight, 10) || 36)
	);
	return Math.max(configured, POLAROID_CHIN_MIN_HEIGHT);
}
