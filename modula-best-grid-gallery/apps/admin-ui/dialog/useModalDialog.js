import { useEffect, useRef } from '@wordpress/element';

/**
 * Keeps a native `<dialog>` in step with the caller's `open`. showModal()
 * makes the page behind it inert, so focus stays inside, and puts it in the
 * top layer. Focus returns to where it was when the dialog closes, also when
 * the caller unmounts it. Escape closes the native dialog first; its `close`
 * event is then reported as a cancel, so the caller updates `open`.
 *
 * @param {boolean}  open
 * @param {Function} onCancel     Escape (the caller closes the dialog).
 * @param {Function} focusInitial Receives the dialog element after it opens.
 * @return {{ dialogRef: Object, onClose: Function }} Ref and `onClose` handler for the `<dialog>`.
 */
export function useModalDialog(open, onCancel, focusInitial) {
	const dialogRef = useRef(null);
	// Set while the caller closes the dialog, so its `close` event is not
	// reported back as a cancel.
	const closingRef = useRef(false);
	const focusInitialRef = useRef(focusInitial);
	const openRef = useRef(open);

	useEffect(() => {
		focusInitialRef.current = focusInitial;
	}, [focusInitial]);

	useEffect(() => {
		openRef.current = open;
	}, [open]);

	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const dialog = dialogRef.current;
		const returnFocus = dialog.ownerDocument.activeElement;

		closingRef.current = false;
		dialog.showModal();
		focusInitialRef.current(dialog);

		return () => {
			closingRef.current = true;
			dialog.close();
			if (returnFocus?.isConnected) {
				returnFocus.focus();
			}
		};
	}, [open]);

	const onClose = () => {
		if (closingRef.current) {
			return;
		}
		// Escape closed it natively: tell the caller.
		onCancel();
		// The browser ignores a second preventDefault() on Escape without a
		// user gesture between them, so a caller that is busy can see its
		// dialog closed while it keeps `open`: show it again.
		window.requestAnimationFrame(() => {
			const dialog = dialogRef.current;
			if (openRef.current && dialog?.isConnected && !dialog.open) {
				dialog.showModal();
				focusInitialRef.current(dialog);
			}
		});
	};

	return { dialogRef, onClose };
}
