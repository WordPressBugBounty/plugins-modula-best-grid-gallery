/**
 * Where the compact caption popover panel goes next to the pointer.
 *
 * @package
 */

/** Gap between the pointer and the panel. */
const PANEL_POINTER_OFFSET_PX = 14;

/**
 * Space the panel keeps from the viewport edges. The panel's CSS max-width
 * (`calc(100vw - 16px)` in _caption-compact-popover.scss) leaves this on
 * both sides.
 */
const PANEL_VIEWPORT_MARGIN_PX = 8;

/**
 * Where the panel starts when placed on each side of the pointer.
 *
 * @param {{ x: number, y: number }}          pointer
 * @param {{ width: number, height: number }} size
 * @return {{ right: number, left: number, below: number, above: number }} Panel left (right/left) and top (below/above) per side.
 */
function pointerSideStarts(pointer, size) {
	return {
		right: pointer.x + PANEL_POINTER_OFFSET_PX,
		left: pointer.x - PANEL_POINTER_OFFSET_PX - size.width,
		below: pointer.y + PANEL_POINTER_OFFSET_PX,
		above: pointer.y - PANEL_POINTER_OFFSET_PX - size.height,
	};
}

/**
 * Corners around the pointer, in order of preference: below-right first,
 * then the mirrored sides.
 *
 * @param {{ right: number, left: number, below: number, above: number }} sides
 * @return {Array<{ left: number, top: number }>} Candidate top-left corners.
 */
function pointerCorners(sides) {
	return [
		{ left: sides.right, top: sides.below },
		{ left: sides.left, top: sides.below },
		{ left: sides.right, top: sides.above },
		{ left: sides.left, top: sides.above },
	];
}

/**
 * @param {number} start  Panel start on one axis.
 * @param {number} length Panel length on that axis.
 * @param {number} extent Viewport length on that axis.
 * @return {boolean} Whether the panel stays inside the viewport margins on that axis.
 */
function fitsAxis(start, length, extent) {
	return (
		start >= PANEL_VIEWPORT_MARGIN_PX &&
		start + length <= extent - PANEL_VIEWPORT_MARGIN_PX
	);
}

/**
 * @param {{ left: number, top: number }}     corner
 * @param {{ width: number, height: number }} size
 * @param {{ width: number, height: number }} viewport
 * @return {boolean} Whether the panel stays inside the viewport margins.
 */
function fitsViewport(corner, size, viewport) {
	return (
		fitsAxis(corner.left, size.width, viewport.width) &&
		fitsAxis(corner.top, size.height, viewport.height)
	);
}

/**
 * @param {{ left: number, top: number }}                                corner
 * @param {{ width: number, height: number }}                            size
 * @param {{ left: number, top: number, right: number, bottom: number }} rect
 * @return {boolean} Whether the panel would overlap `rect`.
 */
function overlapsRect(corner, size, rect) {
	return (
		corner.left < rect.right &&
		corner.left + size.width > rect.left &&
		corner.top < rect.bottom &&
		corner.top + size.height > rect.top
	);
}

/**
 * One axis of the fallback: the preferred side if it fits, else the mirrored
 * side, else the preferred side slid back inside the viewport (the margin
 * wins when the panel is longer than the viewport).
 *
 * @param {number} preferred Start on the preferred side (right / below).
 * @param {number} mirrored  Start on the mirrored side (left / above).
 * @param {number} length    Panel length on this axis.
 * @param {number} extent    Viewport length on this axis.
 * @return {number} Start of the panel on this axis.
 */
function placeOnAxis(preferred, mirrored, length, extent) {
	if (fitsAxis(preferred, length, extent)) {
		return preferred;
	}
	if (fitsAxis(mirrored, length, extent)) {
		return mirrored;
	}
	const max = extent - PANEL_VIEWPORT_MARGIN_PX - length;
	return Math.max(PANEL_VIEWPORT_MARGIN_PX, Math.min(preferred, max));
}

/**
 * Preference: a corner around the pointer that fits the viewport and stays
 * off the `avoid` rects (the tile's share button), then any corner that fits,
 * then a per-axis flip or shift.
 *
 * @param {Object}                                                              args
 * @param {{ x: number, y: number }}                                            args.pointer  Client coordinates.
 * @param {{ width: number, height: number }}                                   args.size     Panel size.
 * @param {{ width: number, height: number }}                                   args.viewport
 * @param {Array<{ left: number, top: number, right: number, bottom: number }>} [args.avoid]  Client rects the panel should not cover.
 * @return {{ left: number, top: number }} Client coordinates of the panel's top-left corner.
 */
export function placeCaptionPanel({ pointer, size, viewport, avoid = [] }) {
	const sides = pointerSideStarts(pointer, size);
	const fitting = pointerCorners(sides).filter((candidate) =>
		fitsViewport(candidate, size, viewport)
	);
	const clear = fitting.find((candidate) =>
		avoid.every((rect) => !overlapsRect(candidate, size, rect))
	);
	if (clear) {
		return clear;
	}
	if (fitting.length > 0) {
		return fitting[0];
	}
	// No corner fits: each axis flips or shifts on its own, so the panel may
	// cover the pointer but is never cut off.
	return {
		left: placeOnAxis(sides.right, sides.left, size.width, viewport.width),
		top: placeOnAxis(
			sides.below,
			sides.above,
			size.height,
			viewport.height
		),
	};
}
