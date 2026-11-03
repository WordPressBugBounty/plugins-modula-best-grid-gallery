import { useId } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { CloseIcon } from '../icons/icons';
import { focusTrapTarget } from '../notification-center/focusTrapTarget';
import { isDialogBackdropClick } from './outsideClick';
import { useModalDialog } from './useModalDialog';

// Candidates for Tab inside the dialog; hidden ones are filtered out below.
const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab cycling inside the dialog: the inert page already blocks the
 * page behind, but without this Tab would leave for the browser's own UI.
 *
 * @param {import('react').KeyboardEvent} event
 */
function cycleTab(event) {
	if ('Tab' !== event.key) {
		return;
	}
	const focusables = [
		...event.currentTarget.querySelectorAll(FOCUSABLE),
	].filter((node) => node.tabIndex >= 0 && node.getClientRects().length > 0);
	const target = focusTrapTarget(
		event.shiftKey,
		focusables.indexOf(event.target.ownerDocument.activeElement),
		focusables.length
	);
	if (null === target) {
		return;
	}
	event.preventDefault();
	focusables[target].focus();
}

/**
 * Starts on Close, as in the canvas.
 *
 * @param {HTMLDialogElement} dialog
 */
function focusClose(dialog) {
	dialog.querySelector('[data-dialog="close"]').focus();
}

/**
 * A large modal panel (the editor's Add media dialog): a header with the
 * title, optional header content (a tab list) and Close, then the body,
 * which fills the rest and decides what scrolls. It is a native modal
 * `<dialog>`; the body renders only while it is open. The page behind
 * it is inert and Tab cycles through the dialog's visible controls, so
 * focus stays inside. Focus starts on Close; Escape and Close call `onClose`,
 * and the dialog closes only when the caller sets `open` to false; focus
 * then returns to where it was when the dialog opened (the button that
 * opened it).
 *
 * `size="small"` is a short dialog that fits its content (a choice of a
 * few buttons, a single field). With `closeOnOutsideClick` a click on the
 * backdrop calls `onClose` too, unless `closeDisabled`.
 *
 * @param {Object}                    props
 * @param {boolean}                   props.open
 * @param {Function}                  props.onClose               Close, Escape.
 * @param {string}                    props.title
 * @param {import('react').ReactNode} [props.subtitle]            Under the title, e.g. "3 images · 1 modified".
 * @param {import('react').ReactNode} [props.headerContent]       After the title, e.g. a TabList.
 * @param {import('react').ReactNode} [props.headerActions]       At the right, before Close, e.g. a Columns menu.
 * @param {boolean}                   [props.closeDisabled]       Disables Close while the caller cannot close (work in progress).
 * @param {string}                    [props.closeLabel]          Close's accessible name, e.g. "Close reorder"; "Close" by default.
 * @param {'large'|'small'}           [props.size]
 * @param {boolean}                   [props.closeOnOutsideClick] A backdrop click calls `onClose`.
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children              The body.
 */
export function Dialog({
	open,
	onClose,
	title,
	subtitle = null,
	headerContent = null,
	headerActions = null,
	closeDisabled = false,
	closeLabel = __('Close', 'modula-best-grid-gallery'),
	size = 'large',
	closeOnOutsideClick = false,
	className = '',
	children,
}) {
	const { dialogRef, onClose: onNativeClose } = useModalDialog(
		open,
		onClose,
		focusClose
	);
	const titleId = `modula-admin-dialog-title-${useId()}`;

	return (
		// Escape is the keyboard's close; the click only adds the backdrop.
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
		<dialog
			ref={dialogRef}
			className={[
				'modula-admin-dialog',
				'small' === size ? 'is-small' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			aria-labelledby={titleId}
			// React passes `cancel` and `close` up the component tree, so a
			// ConfirmDialog opened from the body would close this one too:
			// only this dialog's own events count.
			onCancel={(event) => {
				if (event.target !== event.currentTarget) {
					return;
				}
				// Escape asks the caller, which may keep the dialog open
				// (an add still running); the browser does not close it.
				event.preventDefault();
				onClose();
			}}
			onClose={(event) => {
				if (event.target === event.currentTarget) {
					onNativeClose();
				}
			}}
			onKeyDown={cycleTab}
			onClick={(event) => {
				if (
					closeOnOutsideClick &&
					!closeDisabled &&
					isDialogBackdropClick(
						event,
						event.currentTarget.getBoundingClientRect()
					)
				) {
					onClose();
				}
			}}
		>
			<div className="modula-admin-dialog__header">
				<div className="modula-admin-dialog__heading">
					<h2 id={titleId} className="modula-admin-dialog__title">
						{title}
					</h2>
					{subtitle ? (
						<p className="modula-admin-dialog__subtitle">
							{subtitle}
						</p>
					) : null}
				</div>
				{headerContent}
				{headerActions ? (
					<div className="modula-admin-dialog__actions">
						{headerActions}
					</div>
				) : null}
				<button
					type="button"
					className="modula-admin-dialog__close"
					data-dialog="close"
					aria-label={closeLabel}
					disabled={closeDisabled}
					onClick={onClose}
				>
					<CloseIcon size={16} />
				</button>
			</div>
			<div className="modula-admin-dialog__body">
				{open ? children : null}
			</div>
		</dialog>
	);
}
