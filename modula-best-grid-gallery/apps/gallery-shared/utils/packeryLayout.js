/**
 * Modula Gallery - Packery-style layout algorithm
 * Pure bin-packing: start with one full tile, repeatedly split the largest tile.
 * Same logic as CreativeGallery getSlot/splitTile, but no DOM or items—tiles only.
 *
 * @package
 */

const DEFAULT_GUTTER = 10;
const DEFAULT_RANDOM_FACTOR = 0;

/** Keep hashes in safe integer range without bitwise ops (ESLint). */
const HASH_MOD = 2147483647;

/**
 * Stable string hash for layout seeds (deterministic across re-renders).
 *
 * @param {string} str Input
 * @return {number} Non-negative integer
 */
export function hashLayoutSeedString(str) {
	let h = 5381;
	const s = String(str);
	for (let i = 0; i < s.length; i++) {
		h = (Math.imul(h, 33) + s.charCodeAt(i)) % HASH_MOD;
		if (h < 0) {
			h += HASH_MOD;
		}
	}
	return h;
}

/**
 * Deterministic [0, 1) for split jitter (replaces Math.random when layoutSeed is set).
 *
 * @param {number} seed Layout seed (non-negative int)
 * @param {number} step Split index (>= 1)
 * @return {number} In [0, 1)
 */
function deterministic01(seed, step) {
	const u = hashLayoutSeedString(`\0${seed}\0${step}\0`);
	return (u % 1000003) / 1000003;
}

/**
 * Find index of the tile with maximum area.
 *
 * @param {Array<{ area: number }>} tiles - Tiles with .area
 * @return {number}                       Index of max-area tile
 */
function findMaxAreaTileIndex(tiles) {
	let maxIdx = 0;
	for (let i = 0; i < tiles.length; i++) {
		if (tiles[i].area > tiles[maxIdx].area) {
			maxIdx = i;
		}
	}
	return maxIdx;
}

/**
 * Split a tile horizontally (width > height). Returns [shrunkTile, newTile].
 *
 * @param {Object} tile         - { top, left, width, height, area, position }
 * @param {number} gutter       - Gap between tiles
 * @param {number} randomFactor - 0 = half; >0 = random variation
 * @param {number} t01          - Value in [0, 1); split jitter uses (t01 - 0.5)
 * @return {[Object, Object]}  [shrunkTile, newTile]
 */
function splitHorizontally(tile, gutter, randomFactor, t01) {
	const randomMaxDelta = (tile.width / 2) * randomFactor;
	const leftWidth = Math.floor(tile.width / 2 + randomMaxDelta * (t01 - 0.5));

	const shrunkTile = {
		...tile,
		width: leftWidth,
		area: leftWidth * tile.height,
		position: tile.top * 1000 + tile.left,
	};

	const newTile = {
		top: tile.top,
		left: tile.left + leftWidth + gutter,
		width: tile.width - leftWidth - gutter,
		height: tile.height,
		area: (tile.width - leftWidth - gutter) * tile.height,
		position: tile.top * 1000 + (tile.left + leftWidth + gutter),
	};

	return [shrunkTile, newTile];
}

/**
 * Split a tile vertically. Returns [shrunkTile, newTile].
 *
 * @param {Object} tile         - { top, left, width, height, area, position }
 * @param {number} gutter       - Gap between tiles
 * @param {number} randomFactor - 0 = half; >0 = random variation
 * @param {number} t01          - Value in [0, 1)
 * @return {[Object, Object]}  [shrunkTile, newTile]
 */
function splitVertically(tile, gutter, randomFactor, t01) {
	const randomMaxDelta = (tile.height / 2) * randomFactor;
	const topHeight = Math.floor(
		tile.height / 2 + randomMaxDelta * (t01 - 0.5)
	);

	const shrunkTile = {
		...tile,
		height: topHeight,
		area: tile.width * topHeight,
		position: tile.top * 1000 + tile.left,
	};

	const newTile = {
		left: tile.left,
		top: tile.top + topHeight + gutter,
		width: tile.width,
		height: tile.height - topHeight - gutter,
		area: tile.width * (tile.height - topHeight - gutter),
		position: (tile.top + topHeight + gutter) * 1000 + tile.left,
	};

	return [shrunkTile, newTile];
}

/**
 * Split the tile (horizontal or vertical by aspect ratio). Returns [shrunkTile, newTile].
 *
 * @param {Object} tile         - Tile object
 * @param {number} gutter       - Gutter size
 * @param {number} randomFactor - Random factor
 * @param {number} t01          - Value in [0, 1)
 * @return {[Object, Object]}  [shrunkTile, newTile]
 */
function splitTile(tile, gutter, randomFactor, t01) {
	if (tile.width > tile.height) {
		return splitHorizontally(tile, gutter, randomFactor, t01);
	}
	return splitVertically(tile, gutter, randomFactor, t01);
}

/**
 * Generate Packery-style tiles for a given item count.
 * Uses only container size and item count; no DOM or image data.
 *
 * @param {number} containerWidth       - Container width in px
 * @param {number} containerHeight      - Container height in px
 * @param {number} itemCount            - Number of tiles to generate
 * @param {Object} options              - Optional { gutter, randomFactor, layoutSeed }
 * @param {number} [options.layoutSeed] - When set, split jitter uses deterministic01(layoutSeed, i) instead of Math.random (stable across re-renders).
 * @return {Array<{ top: number, left: number, width: number, height: number, area: number, position: number }>} Tiles sorted by position
 */
export function generatePackeryTiles(
	containerWidth,
	containerHeight,
	itemCount,
	options = {}
) {
	const gutter = Number(options.gutter) || DEFAULT_GUTTER;
	const randomFactor = Number(options.randomFactor) ?? DEFAULT_RANDOM_FACTOR;
	const hasLayoutSeed =
		typeof options.layoutSeed === 'number' &&
		Number.isFinite(options.layoutSeed);
	const layoutSeedU = hasLayoutSeed
		? Math.abs(Math.trunc(options.layoutSeed)) % HASH_MOD
		: 0;

	if (itemCount <= 0) {
		return [];
	}

	let tiles = [];

	for (let i = 0; i < itemCount; i++) {
		if (i === 0) {
			tiles.push({
				top: 0,
				left: 0,
				width: containerWidth,
				height: containerHeight,
				area: containerWidth * containerHeight,
				position: 0,
			});
			continue;
		}

		const maxIdx = findMaxAreaTileIndex(tiles);
		const t01 = hasLayoutSeed
			? deterministic01(layoutSeedU, i)
			: Math.random();
		const [shrunkTile, newTile] = splitTile(
			tiles[maxIdx],
			gutter,
			randomFactor,
			t01
		);

		tiles = [
			...tiles.slice(0, maxIdx),
			shrunkTile,
			...tiles.slice(maxIdx + 1),
			newTile,
		];
	}

	tiles.sort((a, b) => a.position - b.position);

	return tiles;
}

export default generatePackeryTiles;
