/**
 * Polaroid “uniform size” layout: equal portrait slots on a simple grid (no packery splits).
 *
 * @package
 */

/** Height ÷ width for each slot (portrait, ~ 3:4 print). */
export const POLAROID_UNIFORM_PORTRAIT_HW = 4 / 3;

/**
 * @param {number} containerWidth - Inner width in px
 * @param {number} itemCount       - Number of items
 * @param {number} gutter          - Gap in px
 * @param {number} [fixedColumns]  - 0 or undefined = auto from width; 1–12 = prints per row
 * @return {Array<{ top: number, left: number, width: number, height: number, area: number, position: number }>}
 */
export function generateUniformPortraitPolaroidTiles(
	containerWidth,
	itemCount,
	gutter,
	fixedColumns
) {
	if (itemCount <= 0 || containerWidth <= 0) {
		return [];
	}
	const g = Math.max(0, Number(gutter) || 0);
	const fc = Math.trunc(Number(fixedColumns) || 0);
	let cols;
	if (fc >= 1 && fc <= 12) {
		cols = fc;
	} else {
		const minW = 100;
		cols = Math.floor((containerWidth + g) / (minW + g));
		cols = Math.max(1, Math.min(cols, itemCount));
	}
	const cellW = (containerWidth - g * (cols - 1)) / cols;
	const cellH = cellW * POLAROID_UNIFORM_PORTRAIT_HW;
	const tiles = [];
	for (let i = 0; i < itemCount; i++) {
		const col = i % cols;
		const row = Math.floor(i / cols);
		const left = col * (cellW + g);
		const top = row * (cellH + g);
		tiles.push({
			top,
			left,
			width: cellW,
			height: cellH,
			area: cellW * cellH,
			position: row * 1e6 + col,
		});
	}
	tiles.sort((a, b) => a.position - b.position);
	return tiles;
}

/**
 * Total section height for uniform polaroid tiles (last row included, no trailing gutter).
 *
 * @param {Array<{ top: number, height: number }>} tiles
 * @return {number}
 */
export function uniformPolaroidSectionHeight(tiles) {
	if (!tiles.length) {
		return 0;
	}
	let maxBottom = 0;
	for (const t of tiles) {
		maxBottom = Math.max(maxBottom, t.top + t.height);
	}
	return maxBottom;
}
