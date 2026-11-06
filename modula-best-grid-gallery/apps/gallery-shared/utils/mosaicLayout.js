/**
 * Modula Gallery - Mosaic layout algorithm (Creative gallery, `mosaic` engine)
 *
 * A port of Jetpack Tiled Gallery's rectangular ("mosaic") layout, read from
 * Automattic/jetpack at commit 618b99b5 (2026-11-04):
 *
 * - Row shapes, their order, thresholds, remaining-image guards and recency
 *   windows follow the block's `extensions/blocks/tiled-gallery/layout/mosaic/ratios.js`
 *   (`ratiosToMosaicRows`). The Jest fixture of that file is run by
 *   `mosaicLayout.test.js` through `mosaicLayout.parity.json`.
 * - Row sizing follows the legacy module's exact math in
 *   `modules/tiled-gallery/tiled-gallery/tiled-gallery-rectangular.php`
 *   (`Jetpack_Tiled_Gallery_Grouper::apply_content_width`) and its
 *   `Jetpack_Constrained_Array_Rounding`, so every row sums to the container
 *   width in integer pixels.
 *
 * Differences from Jetpack, by design (spec: .scratch/creative-grid-jetpack):
 * the gutter is Modula's setting instead of a fixed 4px, and it sits only
 * between neighbours (Jetpack gives every image a 2px margin, so its row box is
 * one gutter wider and taller than ours; `sizeMosaicRow` converts). `wide` is
 * the caller's flag; this module never reads the DOM.
 *
 * Pure: ratios in, integer rectangles out.
 *
 * @package
 */

/** A ratio is `width / height`; Jetpack falls back to a square for unknown sizes. */
const FALLBACK_RATIO = 1;

/** Jetpack's ratio classes: portrait `< 1`, landscape `[1, 2)`, panoramic `>= 2`. */
const LANDSCAPE_MIN_RATIO = 1;
const PANORAMIC_MIN_RATIO = 2;

/** Bands the Two_One / One_Two shapes use (block `ratios.js`). */
const STACKED_PAIR_MIN_RATIO = 0.9;
const STACKED_PAIR_MAX_RATIO = 2;
const LONE_BESIDE_PAIR_MAX_RATIO = 1.6;

/** Sum-of-next-ratios ceilings (block `ratios.js`). */
const THREE_SUM_MAX = 2.5;
const THREE_SYMMETRIC_SUM_MAX = 5;
const FOUR_SUM_MAX = 3.5;
const FOUR_LAST_ROW_SUM_MAX = 7;
const FIVE_SUM_MAX = 5;

/** Symmetric rows need a long gallery (block `ratios.js`: `toProcess.length > 15`). */
const SYMMETRIC_ROW_MIN_REMAINING = 16;

/** The `[1, 1]` fallback applies while more than this many images remain. */
const ONE_ONE_FALLBACK_MIN_REMAINING = 4;

/**
 * @param {number} ratio
 * @return {boolean}
 */
function isLandscape(ratio) {
	return ratio >= LANDSCAPE_MIN_RATIO && ratio < PANORAMIC_MIN_RATIO;
}

/**
 * @param {number} ratio
 * @return {boolean}
 */
function isPortrait(ratio) {
	return ratio < LANDSCAPE_MIN_RATIO;
}

/**
 * @param {number} ratio
 * @return {boolean}
 */
function isPanoramic(ratio) {
	return ratio >= PANORAMIC_MIN_RATIO;
}

/**
 * One of the two images stacked beside a lone image (`overEvery(gte(0.9), lt(2))`).
 *
 * @param {number} ratio
 * @return {boolean}
 */
function isStackedPairImage(ratio) {
	return ratio >= STACKED_PAIR_MIN_RATIO && ratio < STACKED_PAIR_MAX_RATIO;
}

/**
 * The lone image beside a stacked pair (`lt(1.6)`).
 *
 * @param {number} ratio
 * @return {boolean}
 */
function isLoneBesidePair(ratio) {
	return ratio < LONE_BESIDE_PAIR_MAX_RATIO;
}

/**
 * Jetpack `checkNextRatios`: the next images, one per predicate, all match.
 *
 * @param {number[]}                     ratios     Remaining ratios.
 * @param {Array<(r: number) => boolean>} predicates One per image, in order.
 * @return {boolean}
 */
function nextRatiosMatch(ratios, predicates) {
	if (ratios.length < predicates.length) {
		return false;
	}
	return predicates.every((predicate, i) => predicate(ratios[i]));
}

/**
 * @param {number[]} ratios Remaining ratios.
 * @param {number}   count  How many from the front.
 * @return {number} Sum of the next `count` ratios.
 */
function sumOfNext(ratios, count) {
	let total = 0;
	for (let i = 0; i < count && i < ratios.length; i++) {
		total += ratios[i];
	}
	return total;
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @return {boolean}
 */
function shapesEqual(a, b) {
	return a.length === b.length && a.every((size, i) => size === b[i]);
}

/**
 * Jetpack `isNotRecentShape`: the shape is not among the last `window` rows.
 *
 * @param {number[][]} processed Shapes already chosen, oldest first.
 * @param {number[]}   shape
 * @param {number}     window    How many trailing rows to look at.
 * @return {boolean}
 */
function isNotRecentShape(processed, shape, window) {
	const recent = window > 0 ? processed.slice(-window) : [];
	return !recent.some((recentShape) => shapesEqual(recentShape, shape));
}

/**
 * The row shapes Jetpack tries, in order. The first whose `fits` passes wins.
 *
 * `shape` is the column sizes left to right (images stacked per column).
 * `recency` is Jetpack's "not used in the last N rows" window; `fits` receives
 * that check already evaluated as `isNotRecent` because `Four` applies it to
 * only one of its two alternatives (block `isFourValidCandidate`).
 *
 * @type {Array<{
 *   name: string,
 *   shape: number[],
 *   recency: number,
 *   fits: (context: { ratios: number[], isWide: boolean, isNotRecent: boolean }) => boolean,
 * }>}
 */
const MOSAIC_SHAPES = [
	{
		name: 'Reverse_Symmetric_Row',
		shape: [2, 1, 2],
		recency: 5,
		fits: ({ ratios, isNotRecent }) =>
			ratios.length >= SYMMETRIC_ROW_MIN_REMAINING &&
			isNotRecent &&
			nextRatiosMatch(ratios, [
				isLandscape,
				isLandscape,
				isPortrait,
				isLandscape,
				isLandscape,
			]),
	},
	{
		name: 'Long_Symmetric_Row',
		shape: [3, 1, 3],
		recency: 5,
		fits: ({ ratios, isNotRecent }) =>
			ratios.length >= SYMMETRIC_ROW_MIN_REMAINING &&
			isNotRecent &&
			nextRatiosMatch(ratios, [
				isLandscape,
				isLandscape,
				isLandscape,
				isPortrait,
				isLandscape,
				isLandscape,
				isLandscape,
			]),
	},
	{
		name: 'Symmetric_Row',
		shape: [1, 2, 1],
		recency: 5,
		fits: ({ ratios, isNotRecent }) =>
			ratios.length !== 5 &&
			isNotRecent &&
			nextRatiosMatch(ratios, [
				isPortrait,
				isLandscape,
				isLandscape,
				isPortrait,
			]),
	},
	{
		name: 'One_Three',
		shape: [1, 3],
		recency: 3,
		fits: ({ ratios, isNotRecent }) =>
			isNotRecent &&
			nextRatiosMatch(ratios, [
				isPortrait,
				isLandscape,
				isLandscape,
				isLandscape,
			]),
	},
	{
		name: 'Three_One',
		shape: [3, 1],
		recency: 3,
		fits: ({ ratios, isNotRecent }) =>
			isNotRecent &&
			nextRatiosMatch(ratios, [
				isLandscape,
				isLandscape,
				isLandscape,
				isPortrait,
			]),
	},
	{
		name: 'One_Two',
		shape: [1, 2],
		recency: 3,
		fits: ({ ratios, isNotRecent }) =>
			isNotRecent &&
			nextRatiosMatch(ratios, [
				isLoneBesidePair,
				isStackedPairImage,
				isStackedPairImage,
			]),
	},
	{
		name: 'Five',
		shape: [1, 1, 1, 1, 1],
		recency: 1,
		fits: ({ ratios, isWide, isNotRecent }) =>
			isWide &&
			(ratios.length === 5 ||
				(ratios.length !== 10 && ratios.length > 6)) &&
			isNotRecent &&
			sumOfNext(ratios, 5) < FIVE_SUM_MAX,
	},
	{
		name: 'Four',
		shape: [1, 1, 1, 1],
		recency: 1,
		fits: ({ ratios, isNotRecent }) => {
			const sum = sumOfNext(ratios, 4);
			const fitsLongGallery =
				isNotRecent && sum < FOUR_SUM_MAX && ratios.length > 5;
			const fitsAsLastRow =
				sum < FOUR_LAST_ROW_SUM_MAX && ratios.length === 4;
			return fitsLongGallery || fitsAsLastRow;
		},
	},
	{
		name: 'Three',
		shape: [1, 1, 1],
		recency: 3,
		fits: ({ ratios, isWide, isNotRecent }) => {
			const sum = sumOfNext(ratios, 3);
			const hasEnough =
				ratios.length >= 3 &&
				ratios.length !== 4 &&
				ratios.length !== 6;
			// Jetpack compares the two outer ratios with strict equality.
			const nextAreSymmetric =
				ratios.length >= 3 && ratios[0] === ratios[2];
			return (
				hasEnough &&
				isNotRecent &&
				(sum < THREE_SUM_MAX ||
					(sum < THREE_SYMMETRIC_SUM_MAX && nextAreSymmetric) ||
					isWide)
			);
		},
	},
	{
		name: 'Two_One',
		shape: [2, 1],
		recency: 3,
		fits: ({ ratios, isNotRecent }) =>
			isNotRecent &&
			nextRatiosMatch(ratios, [
				isStackedPairImage,
				isStackedPairImage,
				isLoneBesidePair,
			]),
	},
	{
		name: 'Panoramic',
		shape: [1],
		recency: 0,
		fits: ({ ratios }) => nextRatiosMatch(ratios, [isPanoramic]),
	},
];

/**
 * Pick the next row's shape (Jetpack `ratiosToMosaicRows`, one step).
 *
 * @param {number[]}   remaining Ratios not yet placed.
 * @param {number[][]} processed Shapes already chosen, oldest first.
 * @param {boolean}    isWide
 * @return {number[]} Column sizes.
 */
function pickRowShape(remaining, processed, isWide) {
	for (const candidate of MOSAIC_SHAPES) {
		const isNotRecent = isNotRecentShape(
			processed,
			candidate.shape,
			candidate.recency
		);
		if (candidate.fits({ ratios: remaining, isWide, isNotRecent })) {
			return candidate.shape;
		}
	}
	if (remaining.length >= ONE_ONE_FALLBACK_MIN_REMAINING) {
		return [1, 1];
	}
	return new Array(remaining.length).fill(1);
}

/**
 * @param {unknown} value
 * @return {number} A positive finite ratio, or Jetpack's square fallback.
 */
export function normalizeMosaicRatio(value) {
	const ratio = Number(value);
	return Number.isFinite(ratio) && ratio > 0 ? ratio : FALLBACK_RATIO;
}

/**
 * Group ratios into rows of column sizes, as Jetpack's block does.
 *
 * @param {number[]} ratios         Image ratios (`width / height`), in gallery order.
 * @param {Object}   [options]
 * @param {boolean}  [options.wide] Unlocks the symmetric rows and `Five`; Jetpack's "wide" theme / alignment.
 * @return {number[][]} Row shapes: each row is its column sizes, left to right. The sizes sum to `ratios.length`.
 */
export function buildMosaicRows(ratios, { wide = false } = {}) {
	const isWide = wide === true;
	const normalized = Array.isArray(ratios)
		? ratios.map(normalizeMosaicRatio)
		: [];
	const processed = [];
	let remaining = normalized;
	while (remaining.length > 0) {
		const shape = pickRowShape(remaining, processed, isWide);
		processed.push(shape);
		const consumed = shape.reduce((sum, size) => sum + size, 0);
		remaining = remaining.slice(consumed);
	}
	return processed;
}

/**
 * Jetpack `Jetpack_Constrained_Array_Rounding::get_rounded_constrained_array`:
 * floor every value, then hand the missing pixels back one at a time to the
 * entries with the largest fractional parts (wrapping around when more pixels
 * are missing than there are entries), so the integers sum to `targetSum`.
 *
 * @param {number[]} values    Raw (fractional) sizes.
 * @param {number}   targetSum Integer the result must sum to; when it is not usable, the values' own sum.
 * @return {number[]} Integers in the input order.
 */
export function roundConstrained(values, targetSum) {
	const entries = values.map((value, index) => ({
		floor: Math.floor(value),
		fraction: value - Math.floor(value),
		index,
	}));
	const lowerSum = entries.reduce((sum, entry) => sum + entry.floor, 0);
	const target =
		!targetSum || targetSum < lowerSum
			? values.reduce((sum, value) => sum + value, 0)
			: targetSum;
	const missing = Math.floor(target - lowerSum);

	const byFraction = [...entries].sort((a, b) => b.fraction - a.fraction);
	for (let i = 0; i < missing && byFraction.length > 0; i++) {
		byFraction[i % byFraction.length].floor += 1;
	}
	return entries.map((entry) => entry.floor);
}

/**
 * Jetpack `Jetpack_Tiled_Gallery_Group::get_ratio`: images stacked in one
 * column share a width, so the column's ratio is the harmonic combination.
 *
 * @param {number[]} ratios Ratios of the images stacked in the column.
 * @return {number}
 */
function columnRatio(ratios) {
	const inverseSum = ratios.reduce((sum, ratio) => sum + 1 / ratio, 0);
	return inverseSum > 0 ? 1 / inverseSum : FALLBACK_RATIO;
}

/**
 * @param {number} value
 * @return {number} Never below zero: a container narrower than its gutters yields empty tiles, not negative ones.
 */
function nonNegative(value) {
	return value > 0 ? value : 0;
}

/**
 * Size one row so it fills `width` exactly (Jetpack legacy PHP math).
 *
 * Jetpack's boxes include one gutter per column horizontally and one per
 * image vertically (every image carries a 2px margin). Modula's gutter sits
 * only between neighbours, so the row is sized as a Jetpack row of
 * `width + gutter`, and the Jetpack row height minus one gutter is ours; the
 * image sizes are the same in both models.
 *
 * @param {number[][]} columns        Ratios per column, left to right; each column's images top to bottom.
 * @param {Object}     options
 * @param {number}     options.width  Row width in px (the container).
 * @param {number}     options.gutter Gap between neighbouring tiles in px.
 * @return {{
 *   height: number,
 *   columns: Array<{ left: number, width: number, images: Array<{ top: number, width: number, height: number }> }>,
 * }} Integer px; column widths plus the gutters between them sum to `width`, and each column's image heights plus the gutters between them sum to `height`.
 */
export function sizeMosaicRow(columns, { width, gutter }) {
	const m = gutter;
	const jetpackWidth = width + m;
	const groups = columns.map((ratios) => ({
		ratios,
		count: ratios.length,
		ratio: columnRatio(ratios),
	}));
	const rowRatio = groups.reduce((sum, group) => sum + group.ratio, 0) || 1;
	const weightedRatio =
		groups.reduce((sum, group) => sum + group.ratio * group.count, 0) || 1;

	const rawHeight =
		(jetpackWidth - m * (groups.length - weightedRatio)) / rowRatio;
	const jetpackHeight = Math.round(rawHeight);

	const rawColumnWidths = groups.map(
		(group) => (rawHeight - m * group.count) * group.ratio + m
	);
	const columnWidths = roundConstrained(rawColumnWidths, jetpackWidth);

	let left = 0;
	const sizedColumns = groups.map((group, columnIndex) => {
		const imageWidth = nonNegative(columnWidths[columnIndex] - m);
		const rawImageHeights = group.ratios.map(
			(ratio) => (rawColumnWidths[columnIndex] - m) / ratio
		);
		const imageHeights = roundConstrained(
			rawImageHeights,
			jetpackHeight - m * group.count
		);

		let top = 0;
		const images = imageHeights.map((rawImageHeight) => {
			const imageHeight = nonNegative(rawImageHeight);
			const image = { top, width: imageWidth, height: imageHeight };
			top += imageHeight + m;
			return image;
		});

		const column = { left, width: imageWidth, images };
		left += imageWidth + m;
		return column;
	});

	return {
		height: nonNegative(jetpackHeight - m),
		columns: sizedColumns,
	};
}

/**
 * @param {{ ratio?: unknown, width?: unknown, height?: unknown }} item
 * @return {number}
 */
function ratioOfItem(item) {
	if (item && item.ratio !== undefined && item.ratio !== null) {
		return normalizeMosaicRatio(item.ratio);
	}
	const width = Number(item?.width);
	const height = Number(item?.height);
	if (width > 0 && height > 0) {
		return normalizeMosaicRatio(width / height);
	}
	return FALLBACK_RATIO;
}

/**
 * Flatten one sized row into tiles, column by column, top to bottom.
 *
 * @param {ReturnType<typeof sizeMosaicRow>} sized
 * @param {number}                           rowIndex
 * @param {number}                           rowTop     Row's top in the gallery, px.
 * @param {number}                           firstIndex Item index of the row's first image.
 * @return {Array<{ index: number, rowIndex: number, columnIndex: number, left: number, top: number, width: number, height: number }>}
 */
function tilesOfRow(sized, rowIndex, rowTop, firstIndex) {
	let index = firstIndex;
	return sized.columns.flatMap((column, columnIndex) =>
		column.images.map((image) => {
			const tile = {
				index,
				rowIndex,
				columnIndex,
				left: column.left,
				top: rowTop + image.top,
				width: image.width,
				height: image.height,
			};
			index += 1;
			return tile;
		})
	);
}

/**
 * Lay a gallery out as mosaic rows: shapes from `buildMosaicRows`, sizes from
 * `sizeMosaicRow`, rows stacked with one gutter between them.
 *
 * @param {Array<{ ratio?: number, width?: number, height?: number }>} items   Gallery items in order; `ratio`, else `width / height`, else a square.
 * @param {Object}                                                     options
 * @param {number}                                                     options.containerWidth Container width in px.
 * @param {number}                                                     [options.gutter]       Gap between tiles in px (default 0).
 * @param {boolean}                                                    [options.wide]         See `buildMosaicRows`.
 * @return {{
 *   height: number,
 *   rows: Array<{ top: number, height: number, shape: number[] }>,
 *   tiles: Array<{ index: number, rowIndex: number, columnIndex: number, left: number, top: number, width: number, height: number }>,
 * }} Tiles in item order; `height` is the whole gallery's.
 */
export function layoutMosaic(items, { containerWidth, gutter = 0, wide }) {
	const width = Number(containerWidth);
	if (!Array.isArray(items) || items.length === 0 || !(width > 0)) {
		return { height: 0, rows: [], tiles: [] };
	}
	const m = Number(gutter);
	const options = { width, gutter: m > 0 ? m : 0 };
	const ratios = items.map(ratioOfItem);
	const shapes = buildMosaicRows(ratios, { wide });

	const rows = [];
	const tiles = [];
	let index = 0;
	let rowTop = 0;
	shapes.forEach((shape, rowIndex) => {
		const firstIndex = index;
		const columns = shape.map((count) => {
			const columnRatios = ratios.slice(index, index + count);
			index += count;
			return columnRatios;
		});
		const sized = sizeMosaicRow(columns, options);
		rows.push({ top: rowTop, height: sized.height, shape });
		tiles.push(...tilesOfRow(sized, rowIndex, rowTop, firstIndex));
		rowTop += sized.height + options.gutter;
	});

	return {
		height: nonNegative(rowTop - options.gutter),
		rows,
		tiles,
	};
}

export default layoutMosaic;
