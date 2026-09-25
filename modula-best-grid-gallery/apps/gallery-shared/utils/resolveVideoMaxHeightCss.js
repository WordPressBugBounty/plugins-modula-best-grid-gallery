/**
 * Normalize Video gallery max-height from settings to a safe CSS length.
 * Only `vh` and `px` are accepted (bare numbers → px). Default `100vh`.
 *
 * @param {unknown} raw - video.maxHeight (string or number).
 * @param {{ fallback?: string }} [opts]
 * @return {string} CSS max-height value.
 */
export function resolveVideoMaxHeightCss(raw, opts = {}) {
	const fallback = opts.fallback ?? '100vh';
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
	if (s.length > 64) {
		return fallback;
	}
	if (/^\d+(\.\d+)?$/.test(s)) {
		return `${s}px`;
	}
	const match = s.match(/^(\d+(?:\.\d+)?)(vh|px)$/i);
	if (!match) {
		return fallback;
	}
	return `${match[1]}${match[2].toLowerCase()}`;
}
