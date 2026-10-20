import { useEffect, useId, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '../button/Button';

/**
 * Asks before a destructive action: a modal `<dialog>` with a title, the
 * consequence, Cancel and the confirming action. The browser keeps focus
 * inside it and makes the page behind it inert; focus starts on Cancel, the
 * safe choice, and returns to where it was when the dialog closes, also when
 * the caller unmounts it. Escape cancels. The caller owns `open` and closes
 * the dialog from either callback.
 *
 * @param {Object}                    props
 * @param {boolean}                   props.open
 * @param {string}                    props.title        Question, e.g. "Turn off Password Protect?".
 * @param {import('react').ReactNode} props.message      What the action removes.
 * @param {string}                    props.confirmLabel Names the action ("Turn off").
 * @param {Function}                  props.onConfirm
 * @param {Function}                  props.onCancel     Cancel, Escape.
 */
export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel,
	onConfirm,
	onCancel,
}) {
	const dialogRef = useRef(null);
	// Set while the caller closes the dialog, so its `close` event is not
	// reported back as a cancel.
	const closingRef = useRef(false);
	const id = useId();
	const titleId = `modula-admin-confirm-title-${id}`;
	const messageId = `modula-admin-confirm-message-${id}`;

	// showModal() and close() keep the native dialog in step with `open`.
	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const dialog = dialogRef.current;
		const returnFocus = dialog.ownerDocument.activeElement;

		closingRef.current = false;
		dialog.showModal();
		dialog.querySelector('[data-confirm-dialog="cancel"]').focus();

		return () => {
			closingRef.current = true;
			dialog.close();
			if (returnFocus?.isConnected) {
				returnFocus.focus();
			}
		};
	}, [open]);

	return (
		<dialog
			ref={dialogRef}
			className="modula-admin-confirm"
			aria-labelledby={titleId}
			aria-describedby={messageId}
			onClose={() => {
				// Escape closed it natively: tell the caller.
				if (!closingRef.current) {
					onCancel();
				}
			}}
		>
			<h2 id={titleId} className="modula-admin-confirm__title">
				{title}
			</h2>
			<p id={messageId} className="modula-admin-confirm__message">
				{message}
			</p>
			<div className="modula-admin-confirm__actions">
				<Button data-confirm-dialog="cancel" onClick={onCancel}>
					{__('Cancel', 'modula-best-grid-gallery')}
				</Button>
				<Button variant="danger" onClick={onConfirm}>
					{confirmLabel}
				</Button>
			</div>
		</dialog>
	);
}
