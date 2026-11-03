/** Space between the trigger and the panel. */
const GAP = 6;

/** Space the panel keeps from the edges of its bounds. */
const MARGIN = 8;

/**
 * @typedef {{ top: number, bottom: number, left: number, right: number }} Box
 */

/**
 * @typedef {Object} PopoverPlacement
 * @property {number}         top       The panel's top, in window coordinates.
 * @property {number}         left      The panel's left, in window coordinates.
 * @property {number}         maxHeight Room on the chosen side; a taller panel scrolls inside.
 * @property {'bottom'|'top'} side      The side it opened on.
 * @property {boolean}        hidden    The trigger is out of sight (scrolled out of its bounds).
 */

/**
 * Where a popover panel sits, in window coordinates, inside `bounds`: the
 * part of the window its trigger can be seen in (the window, cut down to
 * the trigger's scroll containers). It opens on `side` of its trigger when
 * its content fits there, else on the other side when that fits, else on
 * the roomier side, and never taller than that side's room. `align` lines
 * up its start or end edge with the trigger's. When the trigger has
 * scrolled out of `bounds` the panel is `hidden`, as it would have been
 * clipped with it.
 *
 * @param {Box}                                              anchor The trigger's client rect.
 * @param {{ width: number, height: number }}                size   The panel's natural size.
 * @param {Box}                                              bounds The visible area, in window coordinates.
 * @param {{ align?: 'start'|'end', side?: 'bottom'|'top' }} [prefer]
 * @return {PopoverPlacement} The panel's placement.
 */
export function placePopover(anchor, size, bounds, prefer = {}) {
	const { align = 'start', side = 'bottom' } = prefer;
	const room = {
		bottom: Math.max(0, bounds.bottom - anchor.bottom - GAP - MARGIN),
		top: Math.max(0, anchor.top - bounds.top - GAP - MARGIN),
	};
	const other = side === 'bottom' ? 'top' : 'bottom';
	let chosen = side;
	if (size.height > room[side]) {
		const otherFits = size.height <= room[other];
		chosen = otherFits || room[other] > room[side] ? other : side;
	}
	const maxHeight = room[chosen];
	const height = Math.min(size.height, maxHeight);
	const wanted = align === 'end' ? anchor.right - size.width : anchor.left;
	const hidden =
		anchor.bottom <= bounds.top ||
		anchor.top >= bounds.bottom ||
		anchor.right <= bounds.left ||
		anchor.left >= bounds.right;

	return {
		top:
			chosen === 'bottom'
				? anchor.bottom + GAP
				: anchor.top - GAP - height,
		left: Math.max(
			bounds.left + MARGIN,
			Math.min(wanted, bounds.right - MARGIN - size.width)
		),
		maxHeight,
		side: chosen,
		hidden,
	};
}
