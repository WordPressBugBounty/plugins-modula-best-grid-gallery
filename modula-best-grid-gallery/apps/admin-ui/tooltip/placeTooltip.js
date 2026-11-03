/** Space between the trigger and the tip. */
export const TOOLTIP_GAP = 6;

/** Space the tip keeps from the window's edges. */
const MARGIN = 8;

/**
 * Where the tooltip sits, in window coordinates: centred under its trigger,
 * above it when it would run past the window's foot, and never past the
 * window's left or right edge.
 *
 * @param {{ top: number, bottom: number, left: number, right: number }} anchor   The trigger's client rect.
 * @param {{ width: number, height: number }}                            size     The tip's size.
 * @param {{ width: number, height: number }}                            viewport The window's size.
 * @return {{ top: number, left: number }} The tip's top left corner.
 */
export function placeTooltip(anchor, size, viewport) {
	const below = anchor.bottom + TOOLTIP_GAP;
	const fitsBelow = below + size.height <= viewport.height - MARGIN;
	const centred = (anchor.left + anchor.right - size.width) / 2;

	return {
		top: fitsBelow
			? below
			: Math.max(MARGIN, anchor.top - TOOLTIP_GAP - size.height),
		left: Math.max(
			MARGIN,
			Math.min(centred, viewport.width - MARGIN - size.width)
		),
	};
}
