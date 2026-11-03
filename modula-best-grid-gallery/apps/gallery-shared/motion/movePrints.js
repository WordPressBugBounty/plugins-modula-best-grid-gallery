/**
 * Polaroid "Visitors can move the prints" (Motion → This layout). A mouse or
 * pen drags a print (`.modula-polaroid-slot`) anywhere inside its section; it
 * lifts while held, and stays where it is dropped, above the other prints,
 * until the page reloads. Nothing is saved. A drag never opens the lightbox
 * or follows the link; a plain click still does. Touch keeps scrolling the
 * page, so phones cannot move the prints.
 *
 * This module sets `--modula-print-x` / `-y` (px), `--modula-print-layer`
 * and `data-modula-print` (`held` while dragged, then `moved`) on the print;
 * the look is CSS (apps/frontend-gallery/_layout-motion.scss,
 * `.modula-polaroid-gallery--movable`).
 *
 * @package
 */

const MOVABLE_PRINT = '.modula-polaroid-gallery--movable .modula-polaroid-slot';
const PRINT_X = '--modula-print-x';
const PRINT_Y = '--modula-print-y';
const PRINT_LAYER = '--modula-print-layer';
const PRINT_STATE = 'data-modula-print';
/** A press that moves less than this stays a click. */
const DRAG_THRESHOLD_PX = 4;

/**
 * @param {HTMLElement} print
 * @return {{ x: number, y: number }} The print's current offset from its place in the layout.
 */
function offsetOf(print) {
	return {
		x: parseFloat(print.style.getPropertyValue(PRINT_X)) || 0,
		y: parseFloat(print.style.getPropertyValue(PRINT_Y)) || 0,
	};
}

/**
 * @param {HTMLElement}              print
 * @param {{ x: number, y: number }} offset Offset when the drag starts.
 * @return {{ minX: number, maxX: number, minY: number, maxY: number }} Offsets that keep the print inside its section.
 */
function offsetBounds(print, offset) {
	const section = print.offsetParent ?? print.parentElement;
	const area = section.getBoundingClientRect();
	const box = print.getBoundingClientRect();
	return {
		minX: offset.x + area.left - box.left,
		maxX: offset.x + area.right - box.right,
		minY: offset.y + area.top - box.top,
		maxY: offset.y + area.bottom - box.bottom,
	};
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @return {number} The value inside the range; `min` when the range is empty.
 */
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

/**
 * @param {HTMLElement} print
 */
function resetPrint(print) {
	print.style.removeProperty(PRINT_X);
	print.style.removeProperty(PRINT_Y);
	print.style.removeProperty(PRINT_LAYER);
	print.removeAttribute(PRINT_STATE);
}

/**
 * Lets visitors drag the host's Polaroid prints.
 *
 * @param {HTMLElement} host Gallery element.
 * @return {() => void} Stops, and puts every print back in its place.
 */
export function letVisitorsMovePrints(host) {
	let drag = null;
	let topLayer = 0;
	let swallowClick = false;

	const onDown = (event) => {
		swallowClick = false;
		if (event.pointerType === 'touch' || event.button !== 0) {
			return;
		}
		const print =
			event.target instanceof window.Element
				? event.target.closest(MOVABLE_PRINT)
				: null;
		if (!print || !host.contains(print)) {
			return;
		}
		const offset = offsetOf(print);
		drag = {
			print,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			offset,
			bounds: offsetBounds(print, offset),
			moving: false,
		};
	};
	const onMove = (event) => {
		if (!drag || event.pointerId !== drag.pointerId) {
			return;
		}
		// Released outside the host before the drag began: no pointerup came.
		if (event.buttons === 0) {
			drag = null;
			return;
		}
		const dx = event.clientX - drag.startX;
		const dy = event.clientY - drag.startY;
		if (!drag.moving) {
			if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
				return;
			}
			drag.moving = true;
			drag.print.setPointerCapture(event.pointerId);
			topLayer += 1;
			drag.print.style.setProperty(PRINT_LAYER, String(topLayer));
			drag.print.setAttribute(PRINT_STATE, 'held');
		}
		event.preventDefault();
		const { bounds, offset } = drag;
		drag.print.style.setProperty(
			PRINT_X,
			`${clamp(offset.x + dx, bounds.minX, bounds.maxX)}px`
		);
		drag.print.style.setProperty(
			PRINT_Y,
			`${clamp(offset.y + dy, bounds.minY, bounds.maxY)}px`
		);
	};
	const onUp = (event) => {
		if (!drag || event.pointerId !== drag.pointerId) {
			return;
		}
		if (drag.moving) {
			drag.print.setAttribute(PRINT_STATE, 'moved');
			swallowClick = true;
		}
		drag = null;
	};
	// Capture phase on the host: the click after a drag reaches neither the
	// item's link nor the lightbox (React and Fancybox listen above the host).
	const onClick = (event) => {
		if (!swallowClick) {
			return;
		}
		swallowClick = false;
		event.preventDefault();
		event.stopPropagation();
	};
	// The browser's own image drag would take over the pointer.
	const onNativeDrag = (event) => {
		if (
			event.target instanceof window.Element &&
			event.target.closest(MOVABLE_PRINT)
		) {
			event.preventDefault();
		}
	};

	host.addEventListener('pointerdown', onDown);
	host.addEventListener('pointermove', onMove);
	host.addEventListener('pointerup', onUp);
	host.addEventListener('pointercancel', onUp);
	host.addEventListener('click', onClick, true);
	host.addEventListener('dragstart', onNativeDrag);
	return () => {
		host.removeEventListener('pointerdown', onDown);
		host.removeEventListener('pointermove', onMove);
		host.removeEventListener('pointerup', onUp);
		host.removeEventListener('pointercancel', onUp);
		host.removeEventListener('click', onClick, true);
		host.removeEventListener('dragstart', onNativeDrag);
		host.querySelectorAll(MOVABLE_PRINT).forEach(resetPrint);
	};
}
