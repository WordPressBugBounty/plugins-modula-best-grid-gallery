/**
 * A canvas tile's presses, for double-click to open its panel.
 *
 * The tile's select hit sees every press, including the ones that drag or
 * resize the tile (Custom grid, Freeform). The browser fires `dblclick` for
 * two quick clicks wherever the pointer went in between, so a double-click
 * opens only when both of its presses stayed put on the tile.
 *
 * @typedef {{ clientX: number, clientY: number }} TilePoint
 * @typedef {{
 *   start: TilePoint|null,
 *   stillPresses: number,
 * }} TilePresses `start`: where the press in progress went down; `stillPresses`:
 * how many presses in a row, ending with the last one, stayed put. A
 * cancelled press resets to `INITIAL_TILE_PRESSES`.
 */

/** Pointer travel (px) up to which a press is a click rather than a drag. */
export const TILE_CLICK_SLOP_PX = 4;

/** @type {TilePresses} */
export const INITIAL_TILE_PRESSES = Object.freeze({
	start: null,
	stillPresses: 0,
});

/**
 * @param {TilePresses} presses
 * @param {TilePoint}   point   Pointer down.
 * @return {TilePresses} A press in progress. One still in progress was
 * released off the tile, so the run of still presses breaks.
 */
export function tilePressDown(presses, point) {
	return {
		start: { clientX: point.clientX, clientY: point.clientY },
		stillPresses: presses.start === null ? presses.stillPresses : 0,
	};
}

/**
 * @param {TilePresses} presses
 * @param {TilePoint}   point   Pointer up.
 * @return {TilePresses} The press ended; it extends the run when it stayed put.
 */
export function tilePressUp(presses, point) {
	if (presses.start === null) {
		return INITIAL_TILE_PRESSES;
	}
	const travel = Math.hypot(
		point.clientX - presses.start.clientX,
		point.clientY - presses.start.clientY
	);
	return {
		start: null,
		stillPresses:
			travel <= TILE_CLICK_SLOP_PX ? presses.stillPresses + 1 : 0,
	};
}

/**
 * @typedef {{ shiftKey?: boolean, metaKey?: boolean, ctrlKey?: boolean, altKey?: boolean }} TileModifiers
 */

/**
 * @param {TilePresses}   presses
 * @param {TileModifiers} event   The `dblclick`.
 * @return {boolean} Whether the double-click opens the tile's panel: both of
 * its presses stayed put, and no modifier asks for multi-select instead.
 */
export function isStillDoubleClick(presses, event) {
	const hasModifier = Boolean(
		event.shiftKey || event.metaKey || event.ctrlKey || event.altKey
	);
	return !hasModifier && presses.stillPresses >= 2;
}
