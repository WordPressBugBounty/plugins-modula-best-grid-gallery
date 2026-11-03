import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '../button/Button';
import { isDialogBackdropClick } from '../dialog/outsideClick';
import { useModalDialog } from '../dialog/useModalDialog';

/**
 * Starts on Cancel, the safe choice.
 *
 * @param {HTMLDialogElement} dialog
 */
function focusCancel(dialog) {
	dialog.querySelector('[data-confirm-dialog="cancel"]').focus();
}

/**
 * Asks before a destructive action, or a choice with wide effect: a modal
 * `<dialog>` with a title, the consequence, Cancel and the confirming
 * action. The browser keeps focus
 * inside it and makes the page behind it inert; focus starts on Cancel, the
 * safe choice, and returns to where it was when the dialog closes, also when
 * the caller unmounts it. Escape cancels. The caller owns `open` and closes
 * the dialog from any callback.
 *
 * A choice that removes nothing ("Apply letterbox to other images?") passes
 * `confirmVariant="primary"`, and a narrower answer ("This image only") as
 * `secondaryLabel`, shown between Cancel and the action.
 *
 * While the action runs (`busy`), the buttons are disabled and Escape does
 * nothing; the caller closes the dialog when the action ends.
 *
 * With `cancelOnOutsideClick` a click on the backdrop cancels too (the
 * Content page's destructive confirms), except while busy.
 *
 * @param {Object}                    props
 * @param {boolean}                   props.open
 * @param {string}                    props.title                  Question, e.g. "Turn off Password Protect?".
 * @param {import('react').ReactNode} props.message                What the action removes.
 * @param {string}                    props.confirmLabel           Names the action ("Turn off").
 * @param {Function}                  props.onConfirm
 * @param {Function}                  props.onCancel               Cancel, Escape.
 * @param {'danger'|'primary'}        [props.confirmVariant]
 * @param {string}                    [props.secondaryLabel]       Names a second, narrower action.
 * @param {Function}                  [props.onSecondary]
 * @param {boolean}                   [props.busy]                 The action is running.
 * @param {boolean}                   [props.cancelOnOutsideClick] A backdrop click cancels.
 */
export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel,
	onConfirm,
	onCancel,
	confirmVariant = 'danger',
	secondaryLabel = '',
	onSecondary,
	busy = false,
	cancelOnOutsideClick = false,
}) {
	const { dialogRef, onClose } = useModalDialog(open, onCancel, focusCancel);
	const id = useId();
	const titleId = `modula-admin-confirm-title-${id}`;
	const messageId = `modula-admin-confirm-message-${id}`;

	return (
		// Escape is the keyboard's cancel; the click only adds the backdrop.
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
		<dialog
			ref={dialogRef}
			className="modula-admin-confirm"
			aria-labelledby={titleId}
			aria-describedby={messageId}
			onCancel={(event) => {
				// Escape would close the native dialog under a running action.
				if (busy) {
					event.preventDefault();
				}
			}}
			onClose={onClose}
			onClick={(event) => {
				if (
					cancelOnOutsideClick &&
					!busy &&
					isDialogBackdropClick(
						event,
						event.currentTarget.getBoundingClientRect()
					)
				) {
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
				<Button
					data-confirm-dialog="cancel"
					disabled={busy}
					onClick={onCancel}
				>
					{__('Cancel', 'modula-best-grid-gallery')}
				</Button>
				{'' !== secondaryLabel ? (
					<Button disabled={busy} onClick={onSecondary}>
						{secondaryLabel}
					</Button>
				) : null}
				<Button
					variant={confirmVariant}
					disabled={busy}
					onClick={onConfirm}
				>
					{confirmLabel}
				</Button>
			</div>
		</dialog>
	);
}
