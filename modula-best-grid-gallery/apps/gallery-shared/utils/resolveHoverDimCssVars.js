/**
 * Opaque tint + opacity for hover dim CSS vars (avoid double-dim when color has alpha).
 */

/**
 * @param {string} raw
 * @return {{ r: number, g: number, b: number, a: number }|null}
 */
function parseCssColor(raw) {
	const value = typeof raw === 'string' ? raw.trim() : '';
	if (!value) {
		return null;
	}
	const hexMatch = value.match(
		/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
	);
	if (hexMatch) {
		const h = hexMatch[1];
		if (h.length === 3 || h.length === 4) {
			return {
				r: parseInt(h[0] + h[0], 16),
				g: parseInt(h[1] + h[1], 16),
				b: parseInt(h[2] + h[2], 16),
				a: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1,
			};
		}
		return {
			r: parseInt(h.slice(0, 2), 16),
			g: parseInt(h.slice(2, 4), 16),
			b: parseInt(h.slice(4, 6), 16),
			a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
		};
	}
	const rgbaMatch = value.match(
		/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i
	);
	if (rgbaMatch) {
		return {
			r: Math.max(0, Math.min(255, parseInt(rgbaMatch[1], 10))),
			g: Math.max(0, Math.min(255, parseInt(rgbaMatch[2], 10))),
			b: Math.max(0, Math.min(255, parseInt(rgbaMatch[3], 10))),
			a:
				rgbaMatch[4] !== undefined
					? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
					: 1,
		};
	}
	return null;
}

/**
 * @param {number} n
 * @return {string}
 */
function toHex2(n) {
	return Math.max(0, Math.min(255, Math.round(n)))
		.toString(16)
		.padStart(2, '0');
}

/**
 * @param {string} hoverColor
 * @param {number|string} hoverOpacity
 * @return {{ tint: string, opacity: string }|null}
 */
export function resolveHoverDimCssVars(hoverColor, hoverOpacity) {
	const parts = parseCssColor(
		typeof hoverColor === 'string' ? hoverColor : ''
	);
	if (!parts) {
		return null;
	}
	const opacityRaw = Number(hoverOpacity);
	const opacityPct = Number.isFinite(opacityRaw)
		? Math.min(100, Math.max(0, Math.round(opacityRaw)))
		: Math.round(parts.a * 100);
	return {
		tint: `#${toHex2(parts.r)}${toHex2(parts.g)}${toHex2(parts.b)}`,
		opacity: String(opacityPct / 100),
	};
}
