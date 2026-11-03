/**
 * @typedef {Object} DialogBox
 * @property {number} top    Top edge, in window coordinates.
 * @property {number} right  Right edge.
 * @property {number} bottom Bottom edge.
 * @property {number} left   Left edge.
 */

/**
 * Whether a click landed on a modal `<dialog>`'s backdrop. The backdrop is
 * part of the dialog element, so a click there targets the dialog itself,
 * as a click on its own padding does; only the position tells them apart.
 * A click from the keyboard (Enter on a button) has no position and never
 * counts.
 *
 * @param {{ target: EventTarget, currentTarget: EventTarget, detail: number, clientX: number, clientY: number }} event The click.
 * @param {DialogBox}                                                                                             box   The dialog's bounding box.
 * @return {boolean} True for a click outside the dialog's box.
 */
export function isDialogBackdropClick(event, box) {
	if (event.target !== event.currentTarget || 0 === event.detail) {
		return false;
	}

	return (
		event.clientX < box.left ||
		event.clientX > box.right ||
		event.clientY < box.top ||
		event.clientY > box.bottom
	);
}
