/**
 * The layout miniature a gallery made of content blocks shows as its cover:
 * REST drawing data (Listing_Gallery_Miniature) → tiles ready to paint.
 */

/**
 * @typedef {Object} ListingMiniatureTile
 * @property {number} x     Left, in cells.
 * @property {number} y     Top, in cells.
 * @property {number} w     Width, in cells.
 * @property {number} h     Height, in cells.
 * @property {string} fill  CSS colour; '' for none.
 * @property {string} image Background image URL; '' for none.
 */

/**
 * @typedef {Object} ListingMiniature
 * @property {number}                 columns Layout width, in cells.
 * @property {number}                 rows    Layout height, in cells.
 * @property {ListingMiniatureTile[]} tiles   In paint order.
 */

/**
 * @param {unknown} value
 * @return {boolean} Whether value is a whole number ≥ 0.
 */
function isCell(value) {
	return Number.isInteger(value) && value >= 0;
}

/**
 * @param {unknown[]} palette
 * @param {unknown}   index   -1 for none.
 * @return {string} The palette entry, '' for none or an unknown index.
 */
function paletteValue(palette, index) {
	const value = Number.isInteger(index) ? palette[index] : undefined;
	return typeof value === 'string' ? value : '';
}

/**
 * Read the drawing data, dropping malformed tiles.
 *
 * Payload: `{ columns, rows, fills: string[], images: string[], tiles:
 * [x, y, w, h, fillIndex, imageIndex][] }`, indices -1 for none.
 *
 * @param {unknown} raw `cover.miniature` or the preview's `miniature`.
 * @return {ListingMiniature|null} Null when there is nothing to draw.
 */
export function readListingMiniature(raw) {
	if (!raw || typeof raw !== 'object') {
		return null;
	}
	const { columns, rows } = /** @type {Record<string, unknown>} */ (raw);
	if (!isCell(columns) || !isCell(rows) || columns === 0 || rows === 0) {
		return null;
	}
	const fills = Array.isArray(raw.fills) ? raw.fills : [];
	const images = Array.isArray(raw.images) ? raw.images : [];
	const entries = Array.isArray(raw.tiles) ? raw.tiles : [];

	/** @type {ListingMiniatureTile[]} */
	const tiles = [];
	for (const entry of entries) {
		if (!Array.isArray(entry)) {
			continue;
		}
		const [x, y, w, h, fillIndex, imageIndex] = entry;
		if (![x, y, w, h].every(isCell) || w === 0 || h === 0) {
			continue;
		}
		tiles.push({
			x,
			y,
			w,
			h,
			fill: paletteValue(fills, fillIndex),
			image: paletteValue(images, imageIndex),
		});
	}

	return tiles.length > 0 ? { columns, rows, tiles } : null;
}
