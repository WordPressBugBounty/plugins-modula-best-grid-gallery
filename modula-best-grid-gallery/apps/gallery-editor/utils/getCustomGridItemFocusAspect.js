/**
 * Custom grid: tile aspect ratio from saved span (width × height in grid units).
 * In the editor, cells are square in grid space, so the visible tile aspect is w:h.
 *
 * `gridX` / `gridY` are position only; use `width` / `height` for span.
 *
 * @param {Object|null|undefined} item Preview / modula-images row
 * @return {{ ratio: number, label: string, cellW: number, cellH: number }|null}
 */
export function getCustomGridItemFocusAspect(item) {
	if (!item || typeof item !== 'object') {
		return null;
	}
	const w = parseInt(item.width, 10);
	const h = parseInt(item.height, 10);
	if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
		return null;
	}
	const g = gcd(w, h);
	const rw = Math.round(w / g);
	const rh = Math.round(h / g);
	return {
		ratio: w / h,
		label: `${rw}:${rh}`,
		cellW: w,
		cellH: h,
	};
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
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
