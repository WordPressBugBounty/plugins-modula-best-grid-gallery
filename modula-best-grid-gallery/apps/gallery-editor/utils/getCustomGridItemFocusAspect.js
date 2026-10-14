import { getCellSpanFocusAspect } from './getCellSpanFocusAspect';

/**
 * Custom grid: tile aspect ratio from saved span (width × height in grid units).
 * In the editor, cells are square in grid space, so the visible tile aspect is w:h.
 *
 * `gridX` / `gridY` are position only; use `width` / `height` for span.
 *
 * @param {Object|null|undefined} item Preview / modula-images row
 * @return {{ ratio: number, label: string, cellW: number, cellH: number }|null} Null without a positive span.
 */
export function getCustomGridItemFocusAspect(item) {
	if (!item || typeof item !== 'object') {
		return null;
	}
	const w = parseInt(item.width, 10);
	const h = parseInt(item.height, 10);
	const aspect = getCellSpanFocusAspect(w, h);
	if (!aspect) {
		return null;
	}
	return {
		...aspect,
		cellW: w,
		cellH: h,
	};
}
