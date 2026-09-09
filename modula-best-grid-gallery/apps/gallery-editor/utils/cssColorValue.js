/**
 * Parse / serialize CSS colors for settings fields that store rgba (or hex).
 */

/**
 * @param {number} n
 * @return {number}
 */
function clampChannel(n) {
	return Math.max(0, Math.min(255, Number.isFinite(n) ? Math.round(n) : 0));
}

/**
 * @param {number} a
 * @return {number}
 */
function clampAlpha(a) {
	if (!Number.isFinite(a)) {
		return 1;
	}
	return Math.max(0, Math.min(1, a));
}

/**
 * Compact alpha for Modula-style strings (`rgba(30,30,30,.9)`).
 *
 * @param {number} a
 * @return {string}
 */
function formatAlpha(a) {
	const n = Math.round(clampAlpha(a) * 1000) / 1000;
	if (n === 0) {
		return '0';
	}
	if (n === 1) {
		return '1';
	}
	const s = String(n);
	return s.startsWith('0.') ? s.slice(1) : s;
}

/**
 * @param {number} n
 * @return {string}
 */
function toHex2(n) {
	return clampChannel(n).toString(16).padStart(2, '0');
}

/**
 * @param {string} raw
 * @return {{ r: number, g: number, b: number, a: number }|null}
 */
export function parseCssColor(raw) {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (value === '') {
		return null;
	}

	const hexMatch = value.match(
		/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
	);
	if (hexMatch) {
		const h = hexMatch[1];
		if (h.length === 3 || h.length === 4) {
			const r = parseInt(h[0] + h[0], 16);
			const g = parseInt(h[1] + h[1], 16);
			const b = parseInt(h[2] + h[2], 16);
			const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
			return { r, g, b, a };
		}
		const r = parseInt(h.slice(0, 2), 16);
		const g = parseInt(h.slice(2, 4), 16);
		const b = parseInt(h.slice(4, 6), 16);
		const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
		return { r, g, b, a };
	}

	const rgbaMatch = value.match(
		/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i
	);
	if (rgbaMatch) {
		return {
			r: clampChannel(parseInt(rgbaMatch[1], 10)),
			g: clampChannel(parseInt(rgbaMatch[2], 10)),
			b: clampChannel(parseInt(rgbaMatch[3], 10)),
			a:
				rgbaMatch[4] !== undefined
					? clampAlpha(parseFloat(rgbaMatch[4]))
					: 1,
		};
	}

	return null;
}

/**
 * @param {{ r: number, g: number, b: number, a?: number }} parts
 * @return {string}
 */
export function formatRgbaColor(parts) {
	const r = clampChannel(parts.r);
	const g = clampChannel(parts.g);
	const b = clampChannel(parts.b);
	const a = clampAlpha(parts.a === undefined ? 1 : parts.a);
	return `rgba(${r},${g},${b},${formatAlpha(a)})`;
}

/**
 * @param {{ r: number, g: number, b: number }} parts
 * @return {string}
 */
export function formatHexColor(parts) {
	return `#${toHex2(parts.r)}${toHex2(parts.g)}${toHex2(parts.b)}`;
}

/**
 * Normalize picker / typed input for save.
 *
 * @param {string}  raw
 * @param {Object}  [opts]
 * @param {boolean} [opts.acceptAlpha]
 * @return {string|null} Normalized color, or null when invalid.
 */
export function normalizeColorForSave(raw, { acceptAlpha = false } = {}) {
	const parts = parseCssColor(raw);
	if (!parts) {
		return null;
	}
	if (acceptAlpha) {
		return formatRgbaColor(parts);
	}
	return formatHexColor(parts);
}
