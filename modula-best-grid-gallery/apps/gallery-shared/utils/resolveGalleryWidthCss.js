/**
 * Normalize gallery container width from settings to a CSS width value.
 *
 * @param {unknown} raw - general.width (string or legacy number).
 * @param {{ fallback?: string }} [opts]
 * @return {string} CSS width value, or opts.fallback when unset or unsafe.
 */
export function resolveGalleryWidthCss(raw, opts = {}) {
	const fallback = opts.fallback ?? '';
	if (raw === undefined || raw === null) {
		return fallback;
	}
	const s =
		typeof raw === 'number' && Number.isFinite(raw)
			? `${Math.round(raw)}px`
			: String(raw).trim();
	if (!s) {
		return fallback;
	}
	if (/^\d+(\.\d+)?$/.test(s)) {
		return `${s}px`;
	}
	if (s.length > 64) {
		return fallback;
	}
	return s;
}
