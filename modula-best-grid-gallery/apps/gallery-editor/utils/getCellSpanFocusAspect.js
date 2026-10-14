/** Shared by Custom Grid and Freeform, whose tiles span whole square cells. */

/**
 * Focus aspect of a tile spanning `w` × `h` square cells. Gutters are ignored,
 * so the ratio is exact on mobile paint and within one gutter on desktop.
 *
 * @param {number} w Span width in cells.
 * @param {number} h Span height in cells.
 * @return {{ ratio: number, label: string }|null} Null for a non-positive span.
 */
export function getCellSpanFocusAspect(w, h) {
	if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
		return null;
	}
	const g = gcd(w, h);
	return {
		ratio: w / h,
		label: `${Math.round(w / g)}:${Math.round(h / g)}`,
	};
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number} Greatest common divisor (1 for zeros).
 */
function gcd(a, b) {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y > 0) {
		const t = y;
		y = x % y;
		x = t;
	}
	return x || 1;
}
