/** Minimum slot width (% of tile) so chips/text never collapse to zero. */
export const HOVER_SLOT_MIN_WIDTH_PERCENT = 15;

/** Builder chip preview cap — keeps long captions draggable in the canvas. */
export const HOVER_BUILDER_CHIP_MAX_WIDTH_PERCENT = 56;

/** Stored X uses left anchor below this, center at 50, right above. */
export const HOVER_SLOT_LEFT_ANCHOR_MAX_X = 49;
export const HOVER_SLOT_CENTER_ANCHOR_X = 50;
export const HOVER_SLOT_RIGHT_ANCHOR_MIN_X = 51;

/**
 * @param {number} x
 * @returns {'left' | 'center' | 'right'}
 */
export function getSlotAnchorSide(x) {
	const n = Math.round(Number(x));
	if (!Number.isFinite(n)) {
		return 'left';
	}
	if (n === HOVER_SLOT_CENTER_ANCHOR_X) {
		return 'center';
	}
	return n > HOVER_SLOT_CENTER_ANCHOR_X ? 'right' : 'left';
}

/**
 * @param {number} x
 * @param {'left' | 'center' | 'right'} side
 * @returns {number}
 */
export function clampSlotXForAnchorSide(x, side) {
	if (side === 'center') {
		return HOVER_SLOT_CENTER_ANCHOR_X;
	}
	const n = Math.round(Number(x));
	if (!Number.isFinite(n)) {
		return side === 'left' ? 25 : 75;
	}
	if (side === 'left') {
		return Math.min(HOVER_SLOT_LEFT_ANCHOR_MAX_X, Math.max(0, n));
	}
	return Math.min(100, Math.max(HOVER_SLOT_RIGHT_ANCHOR_MIN_X, n));
}

/**
 * Anchor translateX for a slot at horizontal percent `x`.
 * Left: grow right; center: grow from middle; right: grow left.
 *
 * @param {number} x
 * @returns {'0%' | '-50%' | '-100%'}
 */
export function getSlotAnchorPercent(x) {
	const side = getSlotAnchorSide(x);
	if (side === 'center') {
		return '-50%';
	}
	return side === 'right' ? '-100%' : '0%';
}

/**
 * Max width (% of tile) available from anchor point.
 *
 * @param {number} x
 * @returns {number}
 */
export function getSlotMaxWidthPercent(x) {
	const side = getSlotAnchorSide(x);
	if (side === 'center') {
		return 100;
	}
	const n = Number(x);
	if (!Number.isFinite(n)) {
		return 50;
	}
	const clamped = Math.min(100, Math.max(0, Math.round(n)));
	const span = side === 'right' ? clamped : 100 - clamped;
	return Math.max(HOVER_SLOT_MIN_WIDTH_PERCENT, span);
}

/**
 * @param {number} x
 * @returns {'left' | 'center' | 'right'}
 */
export function getSlotTextAlign(x) {
	return getSlotAnchorSide(x);
}

/**
 * CSS custom properties for hover v2 free-slot railguards.
 *
 * @param {Record<string, { x: number, y: number }>} positions
 * @returns {Record<string, string>}
 */
export function buildHoverSlotRailStyleVars(positions) {
	/** @type {Record<string, string>} */
	const style = {};
	const slots = /** @type {const} */ (['title', 'caption', 'social']);
	for (const slot of slots) {
		const x = Number(positions?.[slot]?.x ?? 50);
		style[`--modula-hover-slot-${slot}-x`] = `${x}%`;
		style[`--modula-hover-slot-${slot}-y`] =
			`${Number(positions?.[slot]?.y ?? 50)}%`;
		style[`--modula-hover-slot-anchor-${slot}`] = getSlotAnchorPercent(x);
		style[`--modula-hover-slot-max-width-${slot}`] =
			`${getSlotMaxWidthPercent(x)}%`;
		style[`--modula-hover-slot-text-align-${slot}`] = getSlotTextAlign(x);
	}
	return style;
}
