/** Space between the anchor and the popover. */
const GAP = 8;

/** Space the popover keeps from the window's edges. */
const MARGIN = 16;

/**
 * Where the upsell popover sits, in window coordinates: under its anchor
 * with the right edges lined up, above it when it would run past the
 * window's foot, and always inside the window. Without an anchor (it left
 * the page) it centres in the window.
 *
 * @param {{ top: number, bottom: number, left: number, right: number }|null} anchor   The anchor's client rect.
 * @param {{ width: number, height: number }}                                 size     The popover's size.
 * @param {{ width: number, height: number }}                                 viewport The window's size.
 * @return {{ top: number, left: number }} The popover's top left corner.
 */
export function placeUpsellPopover(anchor, size, viewport) {
	const inside = (value, room) =>
		Math.max(MARGIN, Math.min(value, room - MARGIN));

	if (!anchor) {
		return {
			top: inside((viewport.height - size.height) / 2, viewport.height),
			left: inside((viewport.width - size.width) / 2, viewport.width),
		};
	}

	const below = anchor.bottom + GAP;
	const fitsBelow = below + size.height <= viewport.height - MARGIN;
	return {
		top: fitsBelow
			? below
			: Math.max(MARGIN, anchor.top - GAP - size.height),
		left: inside(anchor.right - size.width, viewport.width - size.width),
	};
}
