/**
 * Drag-to-scroll listeners for the Beta Video playlist strip.
 *
 * Pointer capture must wait until the gesture clears the click threshold —
 * capturing on pointerdown retargets the following click away from the thumb
 * (same pattern as showcase carousel drag).
 *
 * @package
 */

import {
	applyPlaylistPointerDrag,
	shouldSuppressPlaylistThumbClick,
} from './playlistScrollbarChrome';

/**
 * @param {HTMLElement} el           Overflow strip element.
 * @param {Object}      options
 * @param {'x'|'y'}     options.axis
 * @return {() => void} Detach listeners.
 */
export function attachPlaylistDragScroll(el, { axis }) {
	let activePointerId = null;
	let startX = 0;
	let startY = 0;
	let startScrollLeft = 0;
	let startScrollTop = 0;
	let dragDistance = 0;
	let suppressClick = false;
	let captured = false;

	const onPointerDown = (event) => {
		if (event.button !== 0) {
			return;
		}
		activePointerId = event.pointerId;
		startX = event.clientX;
		startY = event.clientY;
		startScrollLeft = el.scrollLeft;
		startScrollTop = el.scrollTop;
		dragDistance = 0;
		suppressClick = false;
		captured = false;
	};

	const onPointerMove = (event) => {
		if (activePointerId !== event.pointerId) {
			return;
		}
		const deltaX = event.clientX - startX;
		const deltaY = event.clientY - startY;
		dragDistance = Math.hypot(deltaX, deltaY);
		if (!shouldSuppressPlaylistThumbClick(dragDistance)) {
			return;
		}
		suppressClick = true;
		if (!captured && typeof el.setPointerCapture === 'function') {
			el.setPointerCapture(event.pointerId);
			captured = true;
		}
		const next = applyPlaylistPointerDrag({
			axis,
			startScrollLeft,
			startScrollTop,
			deltaX,
			deltaY,
		});
		el.scrollLeft = next.scrollLeft;
		el.scrollTop = next.scrollTop;
	};

	const endPointer = (event) => {
		if (activePointerId !== event.pointerId) {
			return;
		}
		if (
			captured &&
			typeof el.releasePointerCapture === 'function' &&
			el.hasPointerCapture?.(event.pointerId)
		) {
			el.releasePointerCapture(event.pointerId);
		}
		activePointerId = null;
		captured = false;
		/*
		 * Eat the click that belongs to this gesture (if any), then unlock
		 * so a later thumb click is not cancelled when no click was synthesized.
		 */
		if (suppressClick) {
			window.setTimeout(() => {
				suppressClick = false;
			}, 0);
		}
	};

	const onClickCapture = (event) => {
		if (!suppressClick) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
	};

	el.addEventListener('pointerdown', onPointerDown);
	el.addEventListener('pointermove', onPointerMove);
	el.addEventListener('pointerup', endPointer);
	el.addEventListener('pointercancel', endPointer);
	el.addEventListener('click', onClickCapture, true);

	return () => {
		el.removeEventListener('pointerdown', onPointerDown);
		el.removeEventListener('pointermove', onPointerMove);
		el.removeEventListener('pointerup', endPointer);
		el.removeEventListener('pointercancel', endPointer);
		el.removeEventListener('click', onClickCapture, true);
	};
}
