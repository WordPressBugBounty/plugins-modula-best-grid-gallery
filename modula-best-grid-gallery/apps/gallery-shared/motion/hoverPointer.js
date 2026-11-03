/**
 * Hover card treatments that follow the pointer (Tilt, Pan: `followsPointer`
 * in the animation catalog). While a mouse or pen moves over such an item,
 * the item gets the pointer's offset from its centre as
 * `--modula-hover-pointer-x` / `--modula-hover-pointer-y` (-0.5 to 0.5); the
 * treatment's stylesheet rule (_hover-v2.scss) turns them into motion. One
 * listener per gallery, for every treatment the catalog marks, so a new
 * pointer treatment needs its data and its rule, not code here.
 *
 * @package
 */

import { getPointerCardTreatments } from './motionRuntime';

const POINTER_X = '--modula-hover-pointer-x';
const POINTER_Y = '--modula-hover-pointer-y';

const FOLLOWING_ITEMS = getPointerCardTreatments()
	.map((id) => `.modula-item.modula-hover-card--${id}`)
	.join(',');

/**
 * @param {number} offset Pointer position over the item, 0 to 1.
 * @return {string} Offset from the centre, -0.5 to 0.5.
 */
function fromCentre(offset) {
	return (Math.min(1, Math.max(0, offset)) - 0.5).toFixed(3);
}

/**
 * @param {EventTarget|null} target
 * @return {HTMLElement|null} The pointer-following item the target is in.
 */
function followingItem(target) {
	return target instanceof window.Element
		? target.closest(FOLLOWING_ITEMS)
		: null;
}

/**
 * @param {HTMLElement} item
 */
function clearPointer(item) {
	item.style.removeProperty(POINTER_X);
	item.style.removeProperty(POINTER_Y);
}

/**
 * Starts following the pointer over the host's items.
 *
 * @param {HTMLElement} host Gallery (or preview card) element.
 * @return {() => void} Stops following and clears the offsets it set.
 */
export function followHoverPointer(host) {
	if (FOLLOWING_ITEMS === '') {
		return () => {};
	}
	const onMove = (event) => {
		if (event.pointerType === 'touch') {
			return;
		}
		const item = followingItem(event.target);
		if (!item || !host.contains(item)) {
			return;
		}
		const box = item.getBoundingClientRect();
		if (box.width === 0 || box.height === 0) {
			return;
		}
		item.style.setProperty(
			POINTER_X,
			fromCentre((event.clientX - box.left) / box.width)
		);
		item.style.setProperty(
			POINTER_Y,
			fromCentre((event.clientY - box.top) / box.height)
		);
	};
	const onOut = (event) => {
		const item = followingItem(event.target);
		if (item && !item.contains(event.relatedTarget)) {
			clearPointer(item);
		}
	};
	host.addEventListener('pointermove', onMove);
	host.addEventListener('pointerout', onOut);
	return () => {
		host.removeEventListener('pointermove', onMove);
		host.removeEventListener('pointerout', onOut);
		host.querySelectorAll(FOLLOWING_ITEMS).forEach(clearPointer);
	};
}
