/**
 * Whether a key event comes from inside an open `<dialog>` (admin-ui's
 * Dialog, such as Add media). Window-level Escape handlers of panels behind
 * it skip such events, so Escape closes the dialog and not the panel: their
 * capture listeners run before the dialog sees the key.
 *
 * @param {Event} event
 * @return {boolean} True when the dialog owns the event.
 */
export function isEventInOpenDialog(event) {
	const { target } = event;
	return Boolean(
		target &&
			typeof target.closest === 'function' &&
			target.closest('dialog[open]')
	);
}

/**
 * Whether a key event comes from inside an admin-ui Popover (the canvas
 * toolbar's Sort). The panel handles Escape itself, on the bubble phase, so
 * window capture handlers of panels behind it skip such events, as they do
 * for a dialog.
 *
 * @param {Event} event
 * @return {boolean} True when the popover owns the event.
 */
export function isEventInPopover(event) {
	const { target } = event;
	return Boolean(
		target &&
			typeof target.closest === 'function' &&
			target.closest('.modula-admin-popover')
	);
}
