/**
 * Modula Gallery - Custom grid layout utils
 *
 * Cell math + first-fit packer (legacy order-based layout) and helpers to build
 * react-grid-layout definitions (x, y, w, h) for CustomGridLayout.
 *
 * @package
 */

import { galleryItemRowKey } from './galleryItemIdentity';

/** Minimum tile span (grid units) for custom grid — RGL and store both enforce this floor. */
export const CUSTOM_GRID_MIN_TILE_W = 2;
export const CUSTOM_GRID_MIN_TILE_H = 2;

/**
 * Resolve min tile span from an optional config bag. Gallery stays at 2×2;
 * albums may pass `{ minTileW: 1, minTileH: 1 }`. Also accepts a resolved
 * `{ minW, minH }` so callers can resolve once and reuse.
 *
 * @param {{ minTileW?: number, minTileH?: number, minW?: number, minH?: number }|null|undefined} [minOrConfig]
 * @return {{ minW: number, minH: number }}
 */
export function resolveCustomGridMinTile(minOrConfig) {
	if (
		minOrConfig &&
		typeof minOrConfig.minW === 'number' &&
		typeof minOrConfig.minH === 'number'
	) {
		return {
			minW: Math.max(
				1,
				Math.floor(minOrConfig.minW) || CUSTOM_GRID_MIN_TILE_W
			),
			minH: Math.max(
				1,
				Math.floor(minOrConfig.minH) || CUSTOM_GRID_MIN_TILE_H
			),
		};
	}
	const rawW = minOrConfig?.minTileW ?? CUSTOM_GRID_MIN_TILE_W;
	const rawH = minOrConfig?.minTileH ?? CUSTOM_GRID_MIN_TILE_H;
	const minW = Math.max(1, parseInt(rawW, 10) || CUSTOM_GRID_MIN_TILE_W);
	const minH = Math.max(1, parseInt(rawH, 10) || CUSTOM_GRID_MIN_TILE_H);
	return { minW, minH };
}

/**
 * Compute cell size (px) for one grid column.
 *
 * @param {number} containerWidth - Container width in px
 * @param {number} columns        - Number of columns (1-12)
 * @param {number} gutter         - Gutter between cells (px)
 * @return {number} Cell size in px
 */
export function computeCellSize(containerWidth, columns, gutter) {
	if (columns <= 0) {
		return 0;
	}
	if (gutter > 0) {
		return (containerWidth - gutter * (columns - 1)) / columns;
	}
	return Math.floor((containerWidth / columns) * 1000) / 1000;
}

/**
 * Columns and gutter for custom grid. Custom grid is intentionally non-responsive:
 * same column count and gutter at any container size so the layout looks identical
 * (only pixel dimensions scale). Ignores mobile/tablet column settings.
 *
 * @param {Object} config - Gallery config (columns, gutter, desktopGutter)
 * @return {{ columns: number, gutter: number, enableResponsive: boolean }} Column count, gutter, and responsive flag for custom grid.
 */
export function getResponsiveForCustomGrid(config) {
	return {
		columns: Math.max(1, parseInt(config?.columns ?? 12, 10)),
		gutter: parseInt(config?.desktopGutter ?? config?.gutter ?? 10, 10),
		enableResponsive: false,
	};
}

/**
 * Width / height of an item in grid column/row units (for react-grid-layout w, h).
 *
 * @param {Object}                                                              item        - Item with .width and .height (grid units)
 * @param {number}                                                              columns     - Max columns
 * @param {{ minTileW?: number, minTileH?: number }|null|undefined} [minOrConfig] - Optional floor override (default 2×2)
 * @return {{ w: number, h: number }} Item span in grid column and row units.
 */
export function getItemGridSpan(item, columns, minOrConfig) {
	const cols = Math.max(1, parseInt(columns, 10) || 12);
	const { minW, minH } = resolveCustomGridMinTile(minOrConfig);
	const w = Math.min(cols, Math.max(minW, parseInt(item?.width ?? minW, 10)));
	const h = Math.max(minH, parseInt(item?.height ?? minH, 10));
	return { w, h };
}

/**
 * Whether an item should be static in react-grid-layout (no drag/resize).
 *
 * @param {Object} item - Gallery row
 * @return {boolean} True when the item is flagged as layout-locked.
 */
export function isGridItemLocked(item) {
	if (!item) {
		return false;
	}
	const v = item.gridLocked ?? item.grid_locked;
	if (v === true || v === 1 || v === '1') {
		return true;
	}
	return parseInt(v, 10) === 1;
}

/**
 * Whether an item row has persisted custom-grid cell placement (gridX + gridY).
 * Empty string means “no cell assigned” (see PHP upload); (0,0) is valid.
 *
 * @param {Object} item Gallery row
 * @return {boolean}
 */
export function itemHasSavedCustomGridPlacement(item) {
	return hasExplicitGridPosition(item);
}

/**
 * @param {Object} item Gallery row
 * @return {boolean} True when gridX and gridY are finite non-negative numbers.
 */
function hasExplicitGridPosition(item) {
	if (!item) {
		return false;
	}
	if (
		item.gridX === undefined ||
		item.gridX === null ||
		item.gridY === undefined ||
		item.gridY === null
	) {
		return false;
	}
	const sx = String(item.gridX).trim();
	const sy = String(item.gridY).trim();
	if (sx === '' || sy === '') {
		return false;
	}
	const x = Number(sx);
	const y = Number(sy);
	return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0;
}

/**
 * @param {Object[]} chunk Item list
 * @return {boolean} True when every item has explicit gridX/gridY.
 */
function chunkHasExplicitGridPositions(chunk) {
	return (
		Array.isArray(chunk) &&
		chunk.length > 0 &&
		chunk.every(hasExplicitGridPosition)
	);
}

/**
 * Some tiles have saved gridX/gridY and some do not (e.g. newly added images).
 *
 * @param {Object[]} chunk Item list
 * @return {boolean} True when both explicit and implicit items exist.
 */
export function chunkHasMixedExplicitAndImplicit(chunk) {
	if (!Array.isArray(chunk) || chunk.length === 0) {
		return false;
	}
	let anyExplicit = false;
	let anyImplicit = false;
	for (const item of chunk) {
		if (hasExplicitGridPosition(item)) {
			anyExplicit = true;
		} else {
			anyImplicit = true;
		}
	}
	return anyExplicit && anyImplicit;
}

/**
 * Clamp RGL cell spans and position to column bounds and minimum tile size.
 *
 * @param {{ i: string, x: number, y: number, w: number, h: number, static?: boolean }} item         - Layout cell from RGL.
 * @param {number}                                                                      columns      - Column count for the section.
 * @param {{ minTileW?: number, minTileH?: number }|null|undefined}          [minOrConfig] - Optional floor override (default 2×2)
 * @return {{ i: string, x: number, y: number, w: number, h: number, minW: number, minH: number, static?: boolean }} Normalized cell including minW/minH for RGL.
 */
export function finalizeCustomGridRglCell(item, columns, minOrConfig) {
	const cols = Math.max(1, parseInt(columns, 10) || 12);
	const { minW, minH } = resolveCustomGridMinTile(minOrConfig);
	let x = Math.max(0, Number.parseInt(String(item.x), 10) || 0);
	const y = Math.max(0, Number.parseInt(String(item.y), 10) || 0);
	let w = Math.max(minW, Number.parseInt(String(item.w), 10) || minW);
	const h = Math.max(minH, Number.parseInt(String(item.h), 10) || minH);
	w = Math.min(cols, w);
	if (x + w > cols) {
		x = Math.max(0, cols - w);
	}
	return {
		...item,
		x,
		y,
		w,
		h,
		minW,
		minH,
		static: Boolean(item.static),
	};
}

/**
 * Pixel rectangle for an RGL cell block (must match {@link getItemPixelDimensions} / {@link packedRectToGridCells}).
 *
 * @param {number} gx        Grid column
 * @param {number} gy        Grid row
 * @param {number} w         Width in columns
 * @param {number} h         Height in rows
 * @param {number} cellSize  Cell width px
 * @param {number} rowHeight Cell height px
 * @param {number} gutter    Gutter px
 * @return {{ left: number, top: number, width: number, height: number }} Pixel rectangle for the grid span.
 */
function gridSpanToPixelRect(gx, gy, w, h, cellSize, rowHeight, gutter) {
	const left = gx * (cellSize + gutter);
	const top = gy * (rowHeight + gutter);
	const width = w * cellSize + (w - 1) * gutter;
	const height = h * rowHeight + (h - 1) * gutter;
	return { left, top, width, height };
}

/**
 * Convert packed pixel rect to RGL cells (inverse of getItemPixelDimensions + stride).
 *
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @param {number}                                                       cellSize
 * @param {number}                                                       rowHeight
 * @param {number}                                                       gutter
 * @param {number}                                                       columns
 * @return {{ x: number, y: number, w: number, h: number }} RGL cell coordinates and span.
 */
export function packedRectToGridCells(
	rect,
	cellSize,
	rowHeight,
	gutter,
	columns
) {
	const strideX = cellSize + gutter;
	const strideY = rowHeight + gutter;
	const w = Math.max(1, Math.round((rect.width + gutter) / strideX));
	const h = Math.max(1, Math.round((rect.height + gutter) / strideY));
	let x = Math.round(rect.left / strideX);
	const y = Math.round(rect.top / strideY);
	if (x + w > columns) {
		x = Math.max(0, columns - w);
	}
	return { x, y, w, h };
}

/**
 * Stable unique keys for RGL layout `i` (must match React child keys).
 *
 * @param {Object[]} chunk Item list
 * @return {string[]} Unique string ids for each layout item.
 */
export function buildCustomGridLayoutKeys(chunk) {
	const keys = chunk.map((item, idx) => galleryItemRowKey(item, idx));
	const used = new Set();
	return keys.map((k, idx) => {
		let key = String(k);
		if (used.has(key)) {
			key = `${key}__${idx}`;
		}
		used.add(key);
		return key;
	});
}

/**
 * @param {Array<{ y?: number }>} layout
 * @return {number} Minimum finite y, or 0 when empty / invalid.
 */
export function getCustomGridLayoutMinY(layout) {
	if (!Array.isArray(layout) || layout.length === 0) {
		return 0;
	}
	let minY = Infinity;
	for (const cell of layout) {
		const y = Number(cell?.y);
		if (Number.isFinite(y)) {
			minY = Math.min(minY, y);
		}
	}
	return Number.isFinite(minY) ? minY : 0;
}

/**
 * Shift a chunk layout so the topmost tile sits at y=0.
 *
 * Pagination splits the gallery by item count while tiles keep absolute gridY from
 * the full layout. Later pages then render empty rows above the images. Horizontal
 * placement (gridX) is preserved — left/right alignment is intentional in custom grid.
 *
 * When absolute Y values are not coplanar (e.g. y=6 and y=9 on the same page), a
 * plain shift still leaves holes — callers should prefer
 * {@link buildPackedCustomGridLayoutFromChunk} for that case.
 *
 * @param {Array<{ i: string, x: number, y: number, w: number, h: number, static?: boolean }>} layout
 * @return {Array<{ i: string, x: number, y: number, w: number, h: number, static?: boolean }>}
 */
export function normalizeCustomGridLayoutVerticalOrigin(layout) {
	if (!Array.isArray(layout) || layout.length === 0) {
		return layout;
	}
	const minY = getCustomGridLayoutMinY(layout);
	if (minY <= 0) {
		return layout;
	}
	return layout.map((cell) => ({
		...cell,
		y: Math.max(0, Number(cell.y) - minY),
	}));
}

/**
 * First-fit pack a chunk from item spans (width/height), ignoring saved gridX/gridY.
 *
 * @param {Object[]} chunk
 * @param {string[]} layoutKeys
 * @param {number}   containerWidth
 * @param {number}   columns
 * @param {number}   gutter
 * @param {number}   cellSize
 * @param {number}   rowHeight
 * @param {boolean}  enableResponsive
 * @param {{ minTileW?: number, minTileH?: number }|null|undefined} [minOrConfig]
 * @return {Array<{ i: string, x: number, y: number, w: number, h: number, static?: boolean }>}
 */
export function buildPackedCustomGridLayoutFromChunk(
	chunk,
	layoutKeys,
	containerWidth,
	columns,
	gutter,
	cellSize,
	rowHeight,
	enableResponsive,
	minOrConfig
) {
	const dimensionsList = chunk.map((item) =>
		getItemPixelDimensions(
			item,
			cellSize,
			columns,
			gutter,
			enableResponsive,
			minOrConfig
		)
	);
	const tiles = packCustomGrid(containerWidth, dimensionsList, gutter);
	return tiles.map((tile, idx) => {
		const item = chunk[idx];
		const cells = packedRectToGridCells(
			tile,
			cellSize,
			rowHeight,
			gutter,
			columns
		);
		return {
			i: layoutKeys[idx],
			x: cells.x,
			y: cells.y,
			w: cells.w,
			h: cells.h,
			static: isGridItemLocked(item),
		};
	});
}

/**
 * Build react-grid-layout layout + gridConfig for one section chunk.
 *
 * @param {Object[]} chunk          Gallery items for this section.
 * @param {number}   containerWidth - Measured width (px)
 * @param {Object}   config         - Gallery config (optional minTileW/minTileH; default 2×2)
 * @return {{ layout: Array<{ i: string, x: number, y: number, w: number, h: number, static?: boolean }>, gridConfig: object }} Layout array and grid config for ReactGridLayout.
 */
export function buildCustomGridRglLayout(chunk, containerWidth, config) {
	const { columns, gutter, enableResponsive } =
		getResponsiveForCustomGrid(config);
	const minTile = resolveCustomGridMinTile(config);
	const cellSize = computeCellSize(containerWidth, columns, gutter);
	const rowHeight = Math.round(cellSize);
	const layoutKeys = buildCustomGridLayoutKeys(chunk);

	/** @type {Array<{ i: string, x: number, y: number, w: number, h: number, static?: boolean }>} */
	let layout;
	/** @type {'explicit'|'mixed'|'pack'} */
	let layoutBranch = 'pack';

	if (chunkHasExplicitGridPositions(chunk)) {
		layoutBranch = 'explicit';
		layout = chunk.map((item, idx) => {
			const { w, h } = getItemGridSpan(item, columns, minTile);
			let x = Math.max(0, parseInt(item.gridX, 10));
			const y = Math.max(0, parseInt(item.gridY, 10));
			if (x + w > columns) {
				x = Math.max(0, columns - w);
			}
			return {
				i: layoutKeys[idx],
				x,
				y,
				w,
				h,
				static: isGridItemLocked(item),
			};
		});
	} else if (chunkHasMixedExplicitAndImplicit(chunk)) {
		layoutBranch = 'mixed';
		// Keep saved positions; pack only items without gridX/gridY (add-at-end / REST rows).
		// Full repack would ignore gridX on older items and destroy the layout above.
		const placed = [];
		for (const item of chunk) {
			if (!hasExplicitGridPosition(item)) {
				continue;
			}
			const { w, h } = getItemGridSpan(item, columns, minTile);
			let x = Math.max(0, parseInt(item.gridX, 10));
			const y = Math.max(0, parseInt(item.gridY, 10));
			if (x + w > columns) {
				x = Math.max(0, columns - w);
			}
			placed.push(
				gridSpanToPixelRect(x, y, w, h, cellSize, rowHeight, gutter)
			);
		}
		layout = chunk.map((item, idx) => {
			const key = layoutKeys[idx];
			if (hasExplicitGridPosition(item)) {
				const { w, h } = getItemGridSpan(item, columns, minTile);
				let x = Math.max(0, parseInt(item.gridX, 10));
				const y = Math.max(0, parseInt(item.gridY, 10));
				if (x + w > columns) {
					x = Math.max(0, columns - w);
				}
				return {
					i: key,
					x,
					y,
					w,
					h,
					static: isGridItemLocked(item),
				};
			}
			const dim = getItemPixelDimensions(
				item,
				cellSize,
				columns,
				gutter,
				enableResponsive,
				minTile
			);
			const tile = placePixelBlockInPack(
				dim,
				placed,
				containerWidth,
				gutter
			);
			const cells = packedRectToGridCells(
				tile,
				cellSize,
				rowHeight,
				gutter,
				columns
			);
			return {
				i: key,
				x: cells.x,
				y: cells.y,
				w: cells.w,
				h: cells.h,
				static: isGridItemLocked(item),
			};
		});
	} else {
		layout = buildPackedCustomGridLayoutFromChunk(
			chunk,
			layoutKeys,
			containerWidth,
			columns,
			gutter,
			cellSize,
			rowHeight,
			enableResponsive,
			minTile
		);
	}

	if (layoutBranch === 'explicit' || layoutBranch === 'mixed') {
		const minY = getCustomGridLayoutMinY(layout);
		if (minY > 0) {
			// Absolute coords on a pagination slice (e.g. y=6 + y=9 on one
			// load-more page). A plain Y-shift still leaves in-page holes —
			// pack this chunk from spans so the page is self-contained.
			layout = buildPackedCustomGridLayoutFromChunk(
				chunk,
				layoutKeys,
				containerWidth,
				columns,
				gutter,
				cellSize,
				rowHeight,
				enableResponsive,
				minTile
			);
		} else {
			// Page-local coords: keep left/right; collapse empty rows above.
			layout = normalizeCustomGridLayoutVerticalOrigin(layout);
		}
	} else {
		layout = normalizeCustomGridLayoutVerticalOrigin(layout);
	}

	const finalizedLayout = layout.map((cell) =>
		finalizeCustomGridRglCell(cell, columns, minTile)
	);

	return {
		layout: finalizedLayout,
		gridConfig: {
			cols: columns,
			rowHeight,
			margin: [gutter, gutter],
			containerPadding: [0, 0],
		},
	};
}

/**
 * Packed pixel tiles for public frontend (same placement as RGL / editor, without React Grid Layout).
 *
 * @param {Object[]} chunk
 * @param {number}   containerWidth
 * @param {Object}   config
 * @return {{ tiles: Array<{ left: number, top: number, width: number, height: number }>, containerHeight: number }}
 */
export function buildCustomGridPackedTiles(chunk, containerWidth, config) {
	const { layout, gridConfig } = buildCustomGridRglLayout(
		chunk,
		containerWidth,
		config
	);
	if (!layout?.length || !gridConfig) {
		return { tiles: [], containerHeight: 0 };
	}
	const gutter = gridConfig.margin?.[0] ?? 0;
	const cellSize = computeCellSize(containerWidth, gridConfig.cols, gutter);
	const rowHeight = gridConfig.rowHeight ?? Math.round(cellSize);
	const tiles = layout.map((cell) => {
		const rect = gridSpanToPixelRect(
			cell.x,
			cell.y,
			cell.w,
			cell.h,
			cellSize,
			rowHeight,
			gutter
		);
		return {
			left: rect.left,
			top: rect.top,
			width: rect.width,
			height: rect.height,
		};
	});
	const containerHeight =
		tiles.length === 0
			? 0
			: Math.max(...tiles.map((t) => t.top + t.height));
	return { tiles, containerHeight };
}

/**
 * Get pixel width/height for one item from grid units.
 * Mirrors jQuery createCustomGallery slot logic (data-width, data-height, responsive scaling).
 *
 * @param {Object}  item             - Item with .width and .height (grid units)
 * @param {number}  cellSize         - Cell size in px (from computeCellSize)
 * @param {number}  columns          - Current columns (after responsive)
 * @param {number}  gutter           - Gutter in px
 * @param {boolean} enableResponsive - Whether to scale grid units by columns/12
 * @param {{ minTileW?: number, minTileH?: number, minW?: number, minH?: number }|null|undefined} [minOrConfig]
 * @return {{ width: number, height: number }} Pixel width and height for the tile.
 */
export function getItemPixelDimensions(
	item,
	cellSize,
	columns,
	gutter,
	enableResponsive,
	minOrConfig
) {
	const { minW, minH } = resolveCustomGridMinTile(minOrConfig);
	let widthColumns = Math.max(minW, parseInt(item?.width ?? minW, 10));
	let heightColumns = Math.max(minH, parseInt(item?.height ?? minH, 10));

	if (enableResponsive) {
		widthColumns = Math.min(12, widthColumns);
		const auxWidth = widthColumns;
		const auxHeight = heightColumns;
		if (columns === 1) {
			widthColumns = 1;
			heightColumns = Math.max(
				1,
				Math.round((widthColumns * auxHeight) / auxWidth)
			);
		} else {
			widthColumns = Math.round((columns * auxWidth) / 12);
			if (widthColumns < 1) {
				widthColumns = 1;
			}
			heightColumns = Math.round((widthColumns * auxHeight) / auxWidth);
			if (heightColumns < 1) {
				heightColumns = 1;
			}
		}
	} else {
		const cols = Math.max(1, parseInt(columns, 10) || 12);
		widthColumns = Math.min(cols, widthColumns);
	}

	const sizeRounded = Math.round(cellSize);
	const width = cellSize * widthColumns + gutter * (widthColumns - 1);
	const height = sizeRounded * heightColumns + gutter * (heightColumns - 1);

	// Legacy jquery-modula: width is exact float; only height uses rounded cell size.
	// Rounding width caused 6×(2-col) tiles to exceed a 12-col row by ~1px (5 per row).
	return { width, height: Math.round(height) };
}

/**
 * Check if two rectangles overlap (with optional gutter gap).
 *
 * @param {Object} a      - { left, top, width, height }
 * @param {Object} b      - { left, top, width, height }
 * @param {number} gutter - Minimum gap between rects
 * @return {boolean} True if the two rectangles overlap within gutter spacing.
 */
function overlaps(a, b, gutter) {
	const gap = gutter || 0;
	return !(
		a.left + a.width + gap <= b.left ||
		b.left + b.width + gap <= a.left ||
		a.top + a.height + gap <= b.top ||
		b.top + b.height + gap <= a.top
	);
}

/**
 * Place one block at the first valid position (top-left preference).
 *
 * @param {number}                              w              - Block width
 * @param {number}                              h              - Block height
 * @param {Array<{ left, top, width, height }>} placed         - Already placed rects
 * @param {number}                              containerWidth - Max X
 * @param {number}                              gutter         - Gap between blocks
 * @return {{ left: number, top: number } | null} Top-left position or null if none fits.
 */
function findPosition(w, h, placed, containerWidth, gutter) {
	const candidates = [{ left: 0, top: 0 }];
	for (const rect of placed) {
		candidates.push({
			left: rect.left + rect.width + gutter,
			top: rect.top,
		});
		candidates.push({
			left: rect.left,
			top: rect.top + rect.height + gutter,
		});
	}
	candidates.sort((a, b) => {
		if (a.top !== b.top) {
			return a.top - b.top;
		}
		return a.left - b.left;
	});

	const gap = typeof gutter === 'number' ? gutter : 0;
	for (const pos of candidates) {
		const left = pos.left;
		const top = pos.top;
		if (left + w > containerWidth) {
			continue;
		}
		const candidate = {
			left,
			top,
			width: w,
			height: h,
		};
		const hasOverlap = placed.some((r) => overlaps(r, candidate, gap));
		if (!hasOverlap) {
			return { left, top };
		}
	}
	return null;
}

/**
 * Place one pixel block into `placed` (mutates) and return its rect. Shared by full pack and hybrid explicit+new layout.
 *
 * @param {{ width: number, height: number }}   dim
 * @param {Array<{ left, top, width, height }>} placed
 * @param {number}                              containerWidth
 * @param {number}                              gutter
 * @return {{ left: number, top: number, width: number, height: number }} Placed rectangle (also pushed onto `placed`).
 */
function placePixelBlockInPack(dim, placed, containerWidth, gutter) {
	const w = Math.max(0, dim.width);
	const h = Math.max(0, dim.height);
	const gap = typeof gutter === 'number' ? gutter : 0;
	const maxLeft = Math.max(0, Math.floor(containerWidth));
	const pos = findPosition(w, h, placed, containerWidth, gap);
	let left;
	let top;
	if (pos === null) {
		const maxBottom = placed.length
			? Math.max(...placed.map((r) => r.top + r.height))
			: 0;
		top = maxBottom + gap;
		left = 0;
	} else {
		left = Math.min(pos.left, maxLeft - w);
		top = pos.top;
	}
	const rect = { left, top, width: w, height: h };
	placed.push(rect);
	return rect;
}

/**
 * Pack rectangles in order using 2D first-fit (top-left preference).
 * Same order as Packery: place each block at first valid position.
 *
 * @param {number}                                   containerWidth - Container width in px
 * @param {Array<{ width: number, height: number }>} dimensionsList - One entry per item, in order
 * @param {number}                                   gutter         - Gutter between blocks (px)
 * @return {Array<{ left: number, top: number, width: number, height: number }>} Packed pixel rectangles in item order.
 */
export function packCustomGrid(containerWidth, dimensionsList, gutter) {
	const placed = [];
	const result = [];
	for (const dim of dimensionsList) {
		result.push(placePixelBlockInPack(dim, placed, containerWidth, gutter));
	}
	return result;
}
