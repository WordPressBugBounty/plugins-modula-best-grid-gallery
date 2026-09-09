/**
 * Gallery width percent guardrail: percent values cannot exceed 100%.
 *
 * Bare numbers / px stay unchanged (e.g. `150` → 150px, `150px` → 150px).
 * Only values whose last character is `%` are clamped (e.g. `130%` → `100%`).
 * Applies for every gallery type (not only masonry).
 *
 * @package
 */

/**
 * @param {unknown} raw           general.width
 * @param {unknown} [_galleryType] Unused; kept so existing call sites keep compiling.
 * @return {unknown} Original value, or `100%` when clamped.
 */
export function clampMasonryGalleryWidth(raw, _galleryType) {
	if (raw === undefined || raw === null) {
		return raw;
	}
	const s = String(raw).trim();
	if (!s || s.charAt(s.length - 1) !== '%') {
		return raw;
	}
	const num = parseFloat(s.slice(0, -1).trim());
	if (!Number.isFinite(num) || num <= 100) {
		return raw;
	}
	return '100%';
}
