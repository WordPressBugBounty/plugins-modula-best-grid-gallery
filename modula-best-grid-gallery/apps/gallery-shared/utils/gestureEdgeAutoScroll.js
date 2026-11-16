/**
 * Scrolls the canvas while a drag or resize holds the pointer near its top or
 * bottom edge, so a tile can be taken past what is visible.
 *
 * @package
 */

/** Distance from the scroller's edge, in px, where scrolling starts. */
const EDGE_ZONE_PX = 72;

/** Scroll per animation frame, in px, with the pointer on or past the edge. */
const MAX_STEP_PX = 18;

/**
 * Scroll for one frame: faster the deeper the pointer is in an edge zone.
 *
 * @param {number} pointerY Pointer position (viewport y).
 * @param {number} top      Scroller top (viewport y).
 * @param {number} bottom   Scroller bottom (viewport y).
 * @return {number} Pixels to scroll: negative up, positive down, 0 outside the zones.
 */
export function edgeAutoScrollStep(pointerY, top, bottom) {
	const zone = Math.min(EDGE_ZONE_PX, (bottom - top) / 2);
	if (zone <= 0) {
		return 0;
	}
	const intoTopZone = top + zone - pointerY;
	if (intoTopZone > 0) {
		return -Math.ceil(MAX_STEP_PX * Math.min(1, intoTopZone / zone));
	}
	const intoBottomZone = pointerY - (bottom - zone);
	if (intoBottomZone > 0) {
		return Math.ceil(MAX_STEP_PX * Math.min(1, intoBottomZone / zone));
	}
	return 0;
}

/**
 * The scroll owner is chosen by its overflow alone: a canvas that fits today
 * grows past its scroller once the gesture moves a tile down.
 *
 * @param {Element|null} element
 * @return {Element|null} The nearest ancestor that scrolls vertically.
 */
function findVerticalScroller(element) {
	const view = element?.ownerDocument?.defaultView;
	let node = element?.parentElement ?? null;
	while (view && node) {
		const { overflowY } = view.getComputedStyle(node);
		if (overflowY === 'auto' || overflowY === 'scroll') {
			return node;
		}
		node = node.parentElement;
	}
	return null;
}

/**
 * Starts edge scrolling for one gesture.
 *
 * @param {Element|null} anchor Element inside the canvas scroller.
 * @return {() => void} Stops it and releases the listener and the frame; safe to call twice.
 */
export function startGestureEdgeAutoScroll(anchor) {
	const doc = anchor?.ownerDocument;
	const view = doc?.defaultView;
	const scroller = findVerticalScroller(anchor);
	if (!view || !scroller) {
		return () => {};
	}

	let pointer = null;
	let frame = 0;
	const trackPointer = (event) => {
		pointer = { x: event.clientX, y: event.clientY };
	};
	const scrollOnce = () => {
		frame = view.requestAnimationFrame(scrollOnce);
		if (!pointer) {
			return;
		}
		const { top, bottom } = scroller.getBoundingClientRect();
		const step = edgeAutoScrollStep(pointer.y, top, bottom);
		if (step === 0) {
			return;
		}
		const before = scroller.scrollTop;
		scroller.scrollTop = before + step;
		if (scroller.scrollTop === before) {
			return;
		}
		// The grid library places the tile on mousemove only. A still pointer
		// would let the tile scroll away from it, so repeat the last position.
		doc.dispatchEvent(
			new view.MouseEvent('mousemove', {
				bubbles: true,
				clientX: pointer.x,
				clientY: pointer.y,
			})
		);
	};

	view.addEventListener('pointermove', trackPointer, true);
	frame = view.requestAnimationFrame(scrollOnce);

	return () => {
		view.removeEventListener('pointermove', trackPointer, true);
		view.cancelAnimationFrame(frame);
	};
}
