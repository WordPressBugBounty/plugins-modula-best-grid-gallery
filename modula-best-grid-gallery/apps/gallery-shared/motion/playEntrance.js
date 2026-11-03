/**
 * Plays an entrance on gallery items with the Web Animations API. It
 * interprets the catalog's entrance tracks generically (see the `entrance`
 * primitives in includes/v2/motion/data/animation-catalog.php), so a new
 * entrance is a catalog entry, not code here.
 *
 * Items that enter view together play as one group: their reading order,
 * rows and columns, and their offset from the group's centre drive the
 * staggered delays and the per-item keyframe values.
 *
 * @package
 */

/** Id of every entrance animation, so a replay cancels only these. */
export const ENTRANCE_ANIMATION_ID = 'modula-entrance';

/** Easing of a track that names none (the design's). */
const DEFAULT_EASING = 'cubic-bezier(.2,.8,.2,1)';

/** Items whose top (or left) edges are this close share a row (or column). */
const LINE_SNAP_PX = 24;

/** Rows and columns past this one keep its delay, so long groups do not lag. */
const LAST_STAGGERED_LINE = 8;

/** {fit} scales an item so its longest side fits in this many pixels. */
const FIT_PX = 200;

/** {stack} of the first item; later items stack below it. */
const TOP_STACK = 30;

/**
 * @typedef {import('./motionRuntime').EntranceTrack} EntranceTrack
 */

/**
 * @typedef {Object} EntranceItem
 * @property {HTMLElement}            tile The item.
 * @property {Record<string, number>} vars index, row, col, distance, dx, dy, scatter, fit, stack.
 */

/**
 * @param {number} px
 * @return {number} The line a pixel edge snaps to.
 */
function snapLine(px) {
	return Math.round(px / LINE_SNAP_PX);
}

/**
 * Per-item values of a group, in reading order (rows top to bottom, then
 * left to right), as the design's preview computes them.
 *
 * @param {HTMLElement[]} tiles Items entering view together.
 * @return {EntranceItem[]} The items with their values, in reading order.
 */
function measureGroup(tiles) {
	const rects = tiles.map((tile) => tile.getBoundingClientRect());
	const left = Math.min(...rects.map((rect) => rect.left));
	const top = Math.min(...rects.map((rect) => rect.top));
	const right = Math.max(...rects.map((rect) => rect.right));
	const bottom = Math.max(...rects.map((rect) => rect.bottom));
	const centreX = (left + right) / 2;
	const centreY = (top + bottom) / 2;
	const rowLines = [...new Set(rects.map((rect) => snapLine(rect.top)))].sort(
		(a, b) => a - b
	);
	const colLines = [
		...new Set(rects.map((rect) => snapLine(rect.left))),
	].sort((a, b) => a - b);
	const rowOf = (rect) => rowLines.indexOf(snapLine(rect.top));
	const order = rects
		.map((rect, i) => i)
		.sort(
			(a, b) =>
				rowOf(rects[a]) - rowOf(rects[b]) ||
				rects[a].left - rects[b].left
		);

	return order.map((tileIndex, index) => {
		const rect = rects[tileIndex];
		const dx = centreX - (rect.left + rect.width / 2);
		const dy = centreY - (rect.top + rect.height / 2);
		return {
			tile: tiles[tileIndex],
			vars: {
				index,
				row: Math.min(LAST_STAGGERED_LINE, rowOf(rect)),
				col: Math.min(
					LAST_STAGGERED_LINE,
					colLines.indexOf(snapLine(rect.left))
				),
				distance: Math.hypot(dx, dy),
				dx,
				dy,
				scatter: ((index * 37) % 30) - 15,
				fit: Math.min(1, FIT_PX / Math.max(rect.width, rect.height, 1)),
				stack: Math.max(1, TOP_STACK - index),
			},
		};
	});
}

/**
 * @param {Record<string, number>} timing `base` plus a factor per item variable.
 * @param {Record<string, number>} vars   The item's values.
 * @return {number} Milliseconds.
 */
function timingFor(timing, vars) {
	return Object.entries(timing).reduce(
		(sum, [name, factor]) =>
			sum + (name === 'base' ? factor : factor * (vars[name] ?? 0)),
		0
	);
}

/**
 * @param {Object[]}               keyframes Catalog keyframes.
 * @param {Record<string, number>} vars      The item's values.
 * @return {Object[]} Keyframes with every {name} replaced by the item's value.
 */
function keyframesFor(keyframes, vars) {
	return keyframes.map((keyframe) =>
		Object.fromEntries(
			Object.entries(keyframe).map(([property, value]) => [
				property,
				typeof value === 'string'
					? value.replace(/\{(\w+)\}/g, (token, name) =>
							name in vars
								? String(Math.round(vars[name] * 100) / 100)
								: token
						)
					: value,
			])
		)
	);
}

/**
 * @param {EntranceTrack}          track
 * @param {Record<string, number>} vars
 * @return {Object[]} The track's keyframes, or its alternate ones on an odd row or item.
 */
function trackKeyframes(track, vars) {
	const alternate = track.alternate;
	const odd = alternate && vars[alternate.by] % 2 === 1;
	return keyframesFor(odd ? alternate.keyframes : track.keyframes, vars);
}

/**
 * A layout that places its items with an inline transform (react-grid-layout
 * on the Custom grid canvas) would lose that position while a `transform`
 * keyframe plays, so every item would start at the grid origin. Each
 * `transform` keyframe starts from the item's own transform instead.
 *
 * Prefixing, rather than `composite: 'add'`, because composite applies to
 * every property of a keyframe and would add up opacity, clip and filter too.
 *
 * @param {Object[]} keyframes       The track's keyframes for this item.
 * @param {string}   layoutTransform The item's inline transform; empty when none.
 * @return {Object[]} The keyframes, every `transform` placed after the layout's.
 */
function keepLayoutTransform(keyframes, layoutTransform) {
	if (layoutTransform === '' || layoutTransform === 'none') {
		return keyframes;
	}
	return keyframes.map((keyframe) => {
		if (!('transform' in keyframe)) {
			return keyframe;
		}
		const transform =
			keyframe.transform === 'none'
				? layoutTransform
				: `${layoutTransform} ${keyframe.transform}`;
		return { ...keyframe, transform };
	});
}

/**
 * @param {HTMLElement}   tile
 * @param {EntranceTrack} track
 * @return {Element|null} The element the track animates.
 */
function trackTarget(tile, track) {
	return track.target === 'image' ? tile.querySelector('img') : tile;
}

/**
 * Stops the entrance animations running on an item and its image.
 *
 * @param {HTMLElement} tile
 */
export function cancelEntrance(tile) {
	if (typeof tile.getAnimations !== 'function') {
		return;
	}
	tile.getAnimations({ subtree: true })
		.filter((animation) => animation.id === ENTRANCE_ANIMATION_ID)
		.forEach((animation) => animation.cancel());
}

/**
 * Plays an entrance on items entering view together. Each animation holds its
 * first keyframe through its delay (`fill: backwards`) and leaves the item's
 * own styles in place when it ends.
 *
 * @param {HTMLElement[]}   tiles      Items entering view together.
 * @param {EntranceTrack[]} tracks     What the entrance plays.
 * @param {number}          speedScale Scale on every duration and delay.
 */
export function playEntrance(tiles, tracks, speedScale) {
	if (tiles.length === 0 || tracks.length === 0) {
		return;
	}
	for (const { tile, vars } of measureGroup(tiles)) {
		for (const track of tracks) {
			const target = trackTarget(tile, track);
			if (!target || typeof target.animate !== 'function') {
				continue;
			}
			const keyframes = trackKeyframes(track, vars);
			// Only the item itself carries the layout's position.
			const played =
				target === tile
					? keepLayoutTransform(keyframes, tile.style.transform)
					: keyframes;
			target.animate(played, {
				id: ENTRANCE_ANIMATION_ID,
				duration: timingFor(track.durationMs, vars) * speedScale,
				delay: timingFor(track.delayMs, vars) * speedScale,
				easing: track.easing || DEFAULT_EASING,
				fill: 'backwards',
			});
		}
	}
}
