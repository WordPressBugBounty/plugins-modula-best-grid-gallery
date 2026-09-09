/**
 * Build shared tile frame style from legacy config keys.
 *
 * @package
 */

/**
 * @param {unknown} raw
 * @param {number} fallback
 * @return {number}
 */
function toNonNegativeNumber(raw, fallback = 0) {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0) {
		return fallback;
	}
	return n;
}

/**
 * @param {unknown} raw
 * @param {string} fallback
 * @return {string}
 */
function toCssColor(raw, fallback) {
	const value = String(raw || '').trim();
	return value || fallback;
}

/**
 * @param {Object|undefined|null} config
 * @return {Object|null}
 */
export function tileFrameStyleFromConfig(config) {
	if (!config || typeof config !== 'object') {
		return null;
	}
	if (String(config.type || '').trim() === 'story') {
		return null;
	}
	const borderSize = toNonNegativeNumber(config.borderSize, 0);
	const borderRadius = toNonNegativeNumber(config.borderRadius, 0);
	const shadowSize = toNonNegativeNumber(config.shadowSize, 0);
	const borderColor = toCssColor(config.borderColor, '#000000');
	const shadowColor = toCssColor(config.shadowColor, '#000000');

	/** @type {Record<string, string>} */
	const style = {};
	if (borderSize > 0) {
		style.border = `${borderSize}px solid ${borderColor}`;
		style.boxSizing = 'border-box';
	}
	if (borderRadius > 0) {
		style.borderRadius = `${borderRadius}px`;
		// Clip absolute-fill picture/overlay to rounded corners.
		style.overflow = 'hidden';
	}
	if (shadowSize > 0) {
		style.boxShadow = `0 0 ${shadowSize}px ${shadowColor}`;
	}

	return Object.keys(style).length ? style : null;
}
