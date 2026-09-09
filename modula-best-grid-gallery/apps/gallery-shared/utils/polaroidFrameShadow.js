/**
 * Polaroid frame drop shadow from style.shadowSize (0–20) and style.shadowColor.
 *
 * @package
 */

/** Pleasant default when switching to polaroid or shadow size is 0. */
export const POLAROID_DEFAULT_SHADOW_SIZE = 10;

/** Soft neutral shadow tint (not pure black). */
export const POLAROID_DEFAULT_SHADOW_COLOR = 'rgba(0, 0, 0, 0.14)';

const LEGACY_SOFT_SHADOW = '0 10px 28px rgba(0, 0, 0, 0.12)';

/**
 * @param {unknown} color
 * @return {boolean}
 */
export function isPolaroidDefaultShadowColor(color) {
	const raw = String(color ?? '')
		.trim()
		.toLowerCase();
	return !raw || raw === '#ffffff' || raw === '#fff';
}

/**
 * Shadow size applied automatically when switching to polaroid from an unset state.
 *
 * @param {unknown} shadowSize
 * @return {boolean}
 */
export function isPolaroidPresetShadowSize(shadowSize) {
	return (parseInt(shadowSize, 10) || 0) === POLAROID_DEFAULT_SHADOW_SIZE;
}

/**
 * Shadow color applied automatically when switching to polaroid from the style default.
 *
 * @param {unknown} shadowColor
 * @return {boolean}
 */
export function isPolaroidPresetShadowColor(shadowColor) {
	return String(shadowColor ?? '').trim() === POLAROID_DEFAULT_SHADOW_COLOR;
}

/**
 * @param {unknown} shadowColor
 * @param {number} size
 * @return {string}
 */
function polaroidShadowColor(shadowColor, size) {
	const raw = String(shadowColor || '').trim();
	const alpha = Math.min(0.28, 0.09 + size * 0.009);

	if (isPolaroidDefaultShadowColor(raw)) {
		return `rgba(0, 0, 0, ${alpha.toFixed(3)})`;
	}
	if (raw.startsWith('rgba(') || raw.startsWith('rgb(')) {
		return raw;
	}
	if (raw.startsWith('#')) {
		const hex = raw.replace('#', '');
		const full =
			hex.length === 3
				? hex
						.split('')
						.map((c) => c + c)
						.join('')
				: hex.slice(0, 6);
		const r = parseInt(full.slice(0, 2), 16);
		const g = parseInt(full.slice(2, 4), 16);
		const b = parseInt(full.slice(4, 6), 16);
		if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
			return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
		}
	}
	return raw;
}

/**
 * @param {unknown} shadowSize
 * @param {unknown} shadowColor
 * @return {string}
 */
export function polaroidFrameBoxShadow(shadowSize, shadowColor) {
	const size = Math.max(0, parseInt(shadowSize, 10) || 0);
	if (size === 0) {
		return LEGACY_SOFT_SHADOW;
	}

	const offsetY = Math.round(4 + size * 0.55);
	const blur = Math.round(12 + size * 1.6);
	const spread = -Math.max(1, Math.round(size * 0.15));
	const color = polaroidShadowColor(shadowColor, size);
	const ambientAlpha = (0.05 + size * 0.003).toFixed(3);
	const ambient = `0 ${Math.max(2, Math.round(offsetY * 0.35))}px ${Math.round(blur * 0.5)}px rgba(0, 0, 0, ${ambientAlpha})`;
	const main = `0 ${offsetY}px ${blur}px ${spread}px ${color}`;
	return `${ambient}, ${main}`;
}
