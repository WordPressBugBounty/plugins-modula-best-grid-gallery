/**
 * Video playlist scrollbar chrome: visibility drives drag-to-scroll.
 *
 * When the scrollbar is hidden (default), visitors drag the thumb strip.
 * When the scrollbar is shown, drag is off — native scroll only.
 *
 * @package
 */

/** Pixel distance before a pointer gesture counts as a drag (not a click). */
export const PLAYLIST_DRAG_CLICK_THRESHOLD_PX = 5;

/**
 * @param {Object} [config]
 * @return {{ showScrollbar: boolean, dragEnabled: boolean }}
 */
export function resolvePlaylistScrollbarChrome(config) {
	const showScrollbar = config?.video?.showPlaylistScrollbar === true;
	return {
		showScrollbar,
		dragEnabled: !showScrollbar,
	};
}

/**
 * Map pointer movement from drag start into overflow scroll offsets.
 * Natural drag: content follows the pointer (scroll decreases as delta grows).
 *
 * @param {Object} args
 * @param {'x'|'y'} args.axis
 * @param {number} args.startScrollLeft
 * @param {number} args.startScrollTop
 * @param {number} args.deltaX clientX - startX
 * @param {number} args.deltaY clientY - startY
 * @return {{ scrollLeft: number, scrollTop: number }}
 */
export function applyPlaylistPointerDrag({
	axis,
	startScrollLeft,
	startScrollTop,
	deltaX,
	deltaY,
}) {
	if (axis === 'x') {
		return {
			scrollLeft: startScrollLeft - deltaX,
			scrollTop: startScrollTop,
		};
	}
	return {
		scrollLeft: startScrollLeft,
		scrollTop: startScrollTop - deltaY,
	};
}

/**
 * @param {number} totalDragDistance Euclidean pointer travel since pointerdown.
 * @param {number} [threshold]
 * @return {boolean}
 */
export function shouldSuppressPlaylistThumbClick(
	totalDragDistance,
	threshold = PLAYLIST_DRAG_CLICK_THRESHOLD_PX
) {
	return totalDragDistance >= threshold;
}
