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
 * @return {'left' | 'center' | 'right'}
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
 * @param {number}                      x
 * @param {'left' | 'center' | 'right'} side
 * @return {number}
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
 * @return {'0%' | '-50%' | '-100%'}
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
 * @return {number}
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
 * @return {'left' | 'center' | 'right'}
 */
export function getSlotTextAlign(x) {
	return getSlotAnchorSide(x);
}

/**
 * CSS custom properties for hover v2 free-slot railguards.
 *
 * @param {Record<string, { x: number, y: number }>} positions
 * @return {Record<string, string>}
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

/** Slots from this Y (% of tile) can reach the share button's band. */
export const HOVER_SLOT_SHARE_BAND_MIN_Y = 60;

/**
 * Share-button widths a slot gives up while the collapsed share button shows
 * (PHP `hover_slot_share_inset`): centred copy narrows on both sides,
 * left-anchored copy on its right side, right-anchored copy keeps its width.
 *
 * @param {number} x
 * @param {number} y
 * @return {0 | 1 | 2} Share-button widths to give up.
 */
export function getSlotShareInset(x, y) {
	const side = getSlotAnchorSide(x);
	if (Number(y) < HOVER_SLOT_SHARE_BAND_MIN_Y || side === 'right') {
		return 0;
	}
	return side === 'center' ? 2 : 1;
}

/**
 * Placement vars of the free-slot text grid (`_hover-v2.scss`), as PHP
 * `hover_slot_stack_style` sets them: the row line heights in stack order,
 * each slot's grid row and its share-button inset, then the text scrim bands
 * (`buildHoverScrimStyleVars`).
 *
 * @param {Record<string, { x: number, y: number }>} positions
 * @param {Array<'title'|'caption'|'social'>}        slotOrder Top to bottom.
 * @return {Record<string, string>} Inline style custom properties.
 */
export function buildHoverSlotStackStyleVars(positions, slotOrder) {
	/** @type {Record<string, string>} */
	const style = {};
	slotOrder.forEach((slot, index) => {
		const x = Number(positions?.[slot]?.x ?? 50);
		const y = Number(positions?.[slot]?.y ?? 50);
		style[`--modula-hover-row-y-${index + 1}`] = String(y);
		style[`--modula-hover-slot-row-${slot}`] = String(2 + 2 * index);
		style[`--modula-hover-slot-share-inset-${slot}`] = String(
			getSlotShareInset(x, y)
		);
	});
	return { ...style, ...buildHoverScrimStyleVars(positions, slotOrder) };
}

/** Title and caption on neighbouring rows this close (% of tile) share one scrim band. */
export const HOVER_SCRIM_JOIN_MAX_DY = 20;

/**
 * Grid rows of the text scrim (PHP `hover_scrim_style`). While both title and
 * caption show, the title's band covers both and the caption's is off, so the
 * scrim never darkens twice: `--modula-hover-scrim-title-rows`. A layer shown
 * alone covers `--modula-hover-scrim-{title,caption}-only-rows`.
 *
 * Close neighbours get a band around their rows. Text at the bottom edge (the
 * simple moves' 70 / 84, `HOVER_SCRIM_BOTTOM_EDGE_MIN_Y`) or farther apart
 * gets one scrim from the tile edge nearer the text block's middle (`1 / …`
 * or `… / -1`), past the farther text row.
 *
 * @param {Record<string, { x: number, y: number }>} positions
 * @param {Array<'title'|'caption'|'social'>}        slotOrder Top to bottom.
 * @return {Record<string, string>} Inline style custom properties.
 */
function buildHoverScrimStyleVars(positions, slotOrder) {
	const rows = getHoverScrimRows(positions, slotOrder);
	return {
		'--modula-hover-scrim-title-rows': rows.both,
		'--modula-hover-scrim-title-only-rows': rows.title,
		'--modula-hover-scrim-caption-only-rows': rows.caption,
	};
}

/** The text block's middle at or above this Y (% of tile) scrims from the top edge. */
const HOVER_SCRIM_TOP_EDGE_MAX_MID_Y = 50;

/** Text whose lower line sits at or below this Y (% of tile) scrims from the bottom edge. */
export const HOVER_SCRIM_BOTTOM_EDGE_MIN_Y = 84;

/**
 * @param {Record<string, { x: number, y: number }>} positions
 * @param {Array<'title'|'caption'|'social'>}        slotOrder Top to bottom.
 * @return {{ both: string, title: string, caption: string }} Grid rows of the
 * title's band while both show, and of each layer's band alone.
 */
function getHoverScrimRows(positions, slotOrder) {
	const titleRow = 2 + 2 * slotOrder.indexOf('title');
	const captionRow = 2 + 2 * slotOrder.indexOf('caption');
	const titleY = Number(positions?.title?.y ?? 50);
	const captionY = Number(positions?.caption?.y ?? 50);
	const joined =
		Math.abs(titleRow - captionRow) === 2 &&
		Math.abs(titleY - captionY) <= HOVER_SCRIM_JOIN_MAX_DY;
	const atBottomEdge =
		Math.max(titleY, captionY) >= HOVER_SCRIM_BOTTOM_EDGE_MIN_Y;
	const topRow = Math.min(titleRow, captionRow);
	const bottomRow = Math.max(titleRow, captionRow);
	if (joined && !atBottomEdge) {
		return {
			both: `${topRow} / ${bottomRow + 1}`,
			title: String(titleRow),
			caption: String(captionRow),
		};
	}
	const textInTopHalf =
		(titleY + captionY) / 2 <= HOVER_SCRIM_TOP_EDGE_MAX_MID_Y;
	if (textInTopHalf) {
		return {
			both: `1 / ${bottomRow + 1}`,
			title: `1 / ${titleRow + 1}`,
			caption: `1 / ${captionRow + 1}`,
		};
	}
	return {
		both: `${topRow} / -1`,
		title: `${titleRow} / -1`,
		caption: `${captionRow} / -1`,
	};
}
