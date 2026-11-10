/**
 * Modula Gallery - Bento layout engine (`bento` gallery type)
 *
 * Turns the ordered visible items of a Bento gallery and a track count into
 * one grid placement per item (ADR 0058, spec .scratch/bento-gallery,
 * "Algorithm contract"). The tile shape comes from the item and its position:
 * landscape → wide, portrait → tall, near square → small, a large tile on the
 * Bento rhythm, content blocks and shortcodes wide.
 *
 * Pure and deterministic: no DOM, no settings, no stored spans. The same items,
 * order and track count always give the same layout.
 *
 * @package
 */

/**
 * Fewer than two tracks would turn every shape into a stack. The editor's
 * column settings use the same minimum (getLayoutPolicy).
 */
export const BENTO_MIN_COLUMNS = 2;

/** A ratio is `width / height`; an unknown one counts as square. */
const FALLBACK_RATIO = 1;

/** From this ratio up an image or video is a wide tile. */
const WIDE_MIN_RATIO = 1.3;

/** Up to this ratio an image or video is a tall tile. */
const TALL_MAX_RATIO = 0.77;

/** Bento rhythm: the item at every index divisible by this is a large tile. */
const RHYTHM_INTERVAL = 6;

/** Spans in grid cells per Bento tile shape. */
const SHAPE_SPANS = {
	small: { colSpan: 1, rowSpan: 1 },
	wide: { colSpan: 2, rowSpan: 1 },
	tall: { colSpan: 1, rowSpan: 2 },
	large: { colSpan: 2, rowSpan: 2 },
};

/**
 * Shapes to try, in order, when a wanted shape does not fit at the first free
 * cell. Small always fits there, so every list ends with it.
 */
const FITTING_ORDER = {
	large: ['large', 'wide', 'tall', 'small'],
	wide: ['wide', 'small'],
	tall: ['tall', 'small'],
	small: ['small'],
};

/** Item kinds without a ratio of their own (`itemKind` values); always wide. */
const RATIOLESS_KINDS = new Set(['content_block', 'shortcode']);

/**
 * The one Bento track rule, shared by the engine and the settings projection.
 *
 * @param {unknown} columns
 * @return {number} Whole track count, at least `BENTO_MIN_COLUMNS`.
 */
export function normalizeBentoTracks(columns) {
	const whole = Math.floor(Number(columns));
	if (!Number.isFinite(whole)) {
		return BENTO_MIN_COLUMNS;
	}
	return Math.max(BENTO_MIN_COLUMNS, whole);
}

/**
 * @param {unknown} ratio
 * @return {number} A positive finite ratio, else `FALLBACK_RATIO`.
 */
function normalizeRatio(ratio) {
	const isUsable =
		typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 0;
	return isUsable ? ratio : FALLBACK_RATIO;
}

/**
 * @param {number} index Position among the given (visible) items.
 * @return {boolean} Whether the item falls on the Bento rhythm.
 */
function isOnRhythm(index) {
	return index % RHYTHM_INTERVAL === 0;
}

/**
 * @param {number} ratio Normalized ratio.
 * @return {'wide'|'tall'|'small'} Shape that crops the item least.
 */
function shapeForRatio(ratio) {
	if (ratio >= WIDE_MIN_RATIO) {
		return 'wide';
	}
	if (ratio <= TALL_MAX_RATIO) {
		return 'tall';
	}
	return 'small';
}

/**
 * @param {{ kind?: string, ratio?: number }} item
 * @param {number}                            index
 * @return {keyof SHAPE_SPANS} The shape the item asks for before fitting.
 */
function wantedShape(item, index) {
	if (RATIOLESS_KINDS.has(item?.kind)) {
		return 'wide';
	}
	if (isOnRhythm(index)) {
		return 'large';
	}
	return shapeForRatio(normalizeRatio(item?.ratio));
}

/**
 * @param {{ row: number, column: number, colSpan: number, rowSpan: number }} area
 * @return {Array<{ row: number, column: number }>} Every cell the area covers.
 */
function cellsOf(area) {
	return Array.from({ length: area.rowSpan * area.colSpan }, (_, i) => ({
		row: area.row + Math.floor(i / area.colSpan),
		column: area.column + (i % area.colSpan),
	}));
}

/**
 * Cell occupancy of a grid with a fixed track count and rows added on demand.
 *
 * @param {number} columns
 * @return {{ isFree: (cell: { row: number, column: number }) => boolean, fill: (tile: Object) => void }} Occupancy.
 */
function createOccupancy(columns) {
	const taken = new Set();
	const key = (cell) => cell.row * columns + cell.column;
	return {
		isFree: (cell) => cell.column < columns && !taken.has(key(cell)),
		fill: (tile) => cellsOf(tile).forEach((cell) => taken.add(key(cell))),
	};
}

/**
 * @param {ReturnType<typeof createOccupancy>}   occupancy
 * @param {{ row: number, column: number }}      cell      Top-left cell.
 * @param {{ colSpan: number, rowSpan: number }} spans
 * @return {boolean} Whether every cell of the shape is inside and free.
 */
function shapeFits(occupancy, cell, spans) {
	return cellsOf({ ...cell, ...spans }).every(occupancy.isFree);
}

/**
 * @param {number} index   Row-major cell index.
 * @param {number} columns
 * @return {{ row: number, column: number }} The cell at that index.
 */
function cellAt(index, columns) {
	return { row: Math.floor(index / columns), column: index % columns };
}

/**
 * @param {ReturnType<typeof createOccupancy>} occupancy
 * @param {number}                             columns
 * @param {number}                             from      Row-major cell index to start at.
 * @return {number} Row-major index of the first free cell at or after `from`.
 */
function firstFreeCellIndex(occupancy, columns, from) {
	let index = from;
	while (!occupancy.isFree(cellAt(index, columns))) {
		index++;
	}
	return index;
}

/**
 * @param {ReturnType<typeof createOccupancy>} occupancy
 * @param {{ row: number, column: number }}    cell
 * @param {keyof SHAPE_SPANS}                  shape     Wanted shape.
 * @return {{ colSpan: number, rowSpan: number }} Spans of the first shape that fits.
 */
function fittingSpans(occupancy, cell, shape) {
	const fitting = FITTING_ORDER[shape].find((candidate) =>
		shapeFits(occupancy, cell, SHAPE_SPANS[candidate])
	);
	return SHAPE_SPANS[fitting];
}

/**
 * Places every item at the first free cell, row-major, in the first shape of
 * its fitting order that fits there.
 *
 * @param {Object[]} items
 * @param {number}   columns
 * @return {Array<{ column: number, row: number, colSpan: number, rowSpan: number }>} Tiles in input order.
 */
function placeItems(items, columns) {
	const occupancy = createOccupancy(columns);
	const tiles = [];
	// Every cell before the previous origin is taken, so the scan resumes there.
	let cursor = 0;
	items.forEach((item, index) => {
		cursor = firstFreeCellIndex(occupancy, columns, cursor);
		const cell = cellAt(cursor, columns);
		const spans = fittingSpans(occupancy, cell, wantedShape(item, index));
		const tile = { ...cell, ...spans };
		occupancy.fill(tile);
		tiles.push(tile);
	});
	return tiles;
}

/**
 * The one-cell-thick strip a tile would take next when it grows by one along a
 * span: a column to its right, or a row below it.
 */
const GROWTH_EDGES = {
	colSpan: (tile) => ({
		row: tile.row,
		column: tile.column + tile.colSpan,
		colSpan: 1,
		rowSpan: tile.rowSpan,
	}),
	rowSpan: (tile) => ({
		row: tile.row + tile.rowSpan,
		column: tile.column,
		colSpan: tile.colSpan,
		rowSpan: 1,
	}),
};

/** Closing reshapes only the tail: tiles starting in the grid's last rows. */
const TAIL_ROWS = 2;

/**
 * @param {{ row: number }} tile
 * @param {number}          rows Row count of the closed grid.
 * @return {boolean} Whether closing may reshape the tile.
 */
function isTail(tile, rows) {
	return tile.row >= rows - TAIL_ROWS;
}

/**
 * @param {Object[]} tiles
 * @return {number} The row below the lowest tile.
 */
function bottomRow(tiles) {
	return Math.max(...tiles.map((tile) => tile.row + tile.rowSpan));
}

/**
 * Grows the tile along `span` while the next strip is free and inside `rows`.
 *
 * @param {Object}                             tile      Reshaped in place.
 * @param {keyof GROWTH_EDGES}                 span
 * @param {ReturnType<typeof createOccupancy>} occupancy Filled as the tile grows.
 * @param {number}                             rows
 */
function growWhileFree(tile, span, occupancy, rows) {
	const isOpen = (cell) => cell.row < rows && occupancy.isFree(cell);
	let edge = GROWTH_EDGES[span](tile);
	while (cellsOf(edge).every(isOpen)) {
		occupancy.fill(edge);
		tile[span]++;
		edge = GROWTH_EDGES[span](tile);
	}
}

/**
 * Tries to close the grid on `rows` rows by growing tail tiles only: the last
 * tile widens towards the last track, then every tail tile extends down to the
 * grid's last row as far as free cells allow.
 *
 * @param {Object[]} placed  Placed tiles; not changed.
 * @param {number}   columns
 * @param {number}   rows
 * @return {{ tiles: Object[], rows: number }|null} The closed grid, or null
 *                                                  when growth leaves a hole.
 */
function closeByGrowth(placed, columns, rows) {
	const tiles = placed.map((tile) => ({ ...tile }));
	const occupancy = createOccupancy(columns);
	tiles.forEach(occupancy.fill);
	growWhileFree(tiles[tiles.length - 1], 'colSpan', occupancy, rows);
	tiles
		.filter((tile) => isTail(tile, rows))
		.forEach((tile) => growWhileFree(tile, 'rowSpan', occupancy, rows));
	const hasHole = Array.from({ length: rows * columns }, (_, index) =>
		cellAt(index, columns)
	).some(occupancy.isFree);
	return hasHole ? null : { tiles, rows };
}

/**
 * @param {{ row: number, column: number, rowSpan: number }} tile
 * @param {{ row: number, column: number }}                  last The last placed tile.
 * @return {boolean} Whether `tile` comes down from an earlier row into the last
 *                   tile's row, to its right.
 */
function hangsRightOfLast(tile, last) {
	const reachesLastRow =
		tile.row < last.row && tile.row + tile.rowSpan > last.row;
	return reachesLastRow && tile.column > last.column;
}

/**
 * Frees the last tile's row to its right and everything below that row.
 *
 * @param {Object[]} placed Placed tiles; not changed.
 * @return {Object[]} Copies of the tiles: those reaching below the last tile's
 *                    row end on it, those hanging into it right of the last
 *                    tile end above it.
 */
function shortenToLastRow(placed) {
	const last = placed[placed.length - 1];
	return placed.map((tile) => {
		const endRow = hangsRightOfLast(tile, last) ? last.row : last.row + 1;
		return { ...tile, rowSpan: Math.min(tile.rowSpan, endRow - tile.row) };
	});
}

/**
 * Reshapes the tail so the tiles fill a full `columns` × rows rectangle.
 *
 * Every cell before the last tile's origin (row-major) is already taken, so
 * the free cells are all in the last tile's row, to its right, or below it.
 * First the grid closes on the bottom of the lowest tile by growth alone, so
 * a large or tall tile in a short gallery keeps its two rows. When growth
 * leaves a hole (it would have to stretch a tile starting above the last two
 * rows), the last tile's row becomes the last row instead: tiles reaching
 * below it are shortened to end on it, tiles hanging into it right of the
 * last tile end above it, and the last tile widens to the last track. Either
 * way only tail tiles (starting in the closed grid's last two rows) change.
 *
 * @param {Array<{ column: number, row: number, colSpan: number, rowSpan: number }>} placed  Placed tiles; not changed.
 * @param {number}                                                                   columns
 * @return {{ tiles: Object[], rows: number }} The closed grid.
 */
function closeGrid(placed, columns) {
	if (placed.length === 0) {
		return { tiles: [], rows: 0 };
	}
	const grown = closeByGrowth(placed, columns, bottomRow(placed));
	if (grown) {
		return grown;
	}
	// Shortened, the free cells are the last tile's row right of it, so the
	// last tile's widening always closes the grid.
	const lastRows = placed[placed.length - 1].row + 1;
	return closeByGrowth(shortenToLastRow(placed), columns, lastRows);
}

/**
 * Lays out a Bento gallery.
 *
 * Columns and rows are 0-based grid cells; a tile covers `colSpan` × `rowSpan`
 * cells from its top-left cell. Cells are square.
 *
 * @param {Array<{ kind?: string, ratio?: number }>} items             Visible items in gallery order. `kind` is the gallery item kind (`image`, `video`, `content_block`, `shortcode`); `ratio` is width / height (video: poster).
 * @param {{ columns?: number }}                     [options]
 * @param {number}                                   [options.columns] Grid tracks; clamped to at least 2.
 * @return {{ tiles: Array<{ column: number, row: number, colSpan: number, rowSpan: number }>, rows: number }} One tile per item, in input order, and the grid's row count.
 */
export function layoutBento(items, { columns } = {}) {
	const list = Array.isArray(items) ? items : [];
	const tracks = normalizeBentoTracks(columns);
	return closeGrid(placeItems(list, tracks), tracks);
}
