import { useEffect, useRef, useState } from '@wordpress/element';
import { CheckIcon, InfoIcon } from '../icons/icons';

/**
 * @typedef {'success' | 'error'} ToastTone
 * @typedef {{ label: string, onClick: Function }} ToastAction
 */

// An error stays longer: it has to be read, and it usually asks for action.
const DISMISS_AFTER_MS = {
	success: 3500,
	error: 8000,
};

// A toast with an action (Undo) stays as long, so the action is reachable.
const ACTION_DISMISS_AFTER_MS = 8000;

/**
 * Message at the bottom of the viewport: a confirmation ("Settings saved")
 * or, with `tone="error"`, a failure. The live region stays mounted so each
 * message is announced politely; the toast calls `onDismiss` after a few
 * seconds, and the parent clears `message`. A message is announced when it
 * changes, so clear it before repeating the same text (start of a new save).
 *
 * With `action` the toast carries a button ("Image removed · Undo"). It then
 * stays longer and waits while the pointer is over it or focus is in it.
 * Using the action dismisses the toast.
 *
 * @param {Object}      props
 * @param {string}      props.message   Empty for no toast.
 * @param {Function}    props.onDismiss Called when the message should go.
 * @param {ToastTone}   [props.tone]
 * @param {ToastAction} [props.action]
 */
export function Toast({ message, onDismiss, tone = 'success', action = null }) {
	// The timer restarts per message, not whenever the parent re-renders
	// with a new callback.
	const dismissRef = useRef(onDismiss);
	// Pointer and focus hold the toast separately, and only for the message
	// they were taken on: a new or cleared message starts unheld, since it
	// may never see the matching leave or blur.
	const [holds, setHolds] = useState({
		message: '',
		pointer: false,
		focus: false,
	});
	const hasAction = null !== action;
	const isHeld =
		hasAction &&
		holds.message === message &&
		(holds.pointer || holds.focus);
	const delay = hasAction ? ACTION_DISMISS_AFTER_MS : DISMISS_AFTER_MS[tone];

	useEffect(() => {
		dismissRef.current = onDismiss;
	}, [onDismiss]);

	useEffect(() => {
		if ('' === message || isHeld) {
			return undefined;
		}
		const timer = window.setTimeout(() => dismissRef.current(), delay);

		return () => window.clearTimeout(timer);
	}, [message, delay, isHeld]);

	const setHold = (kind, held) =>
		setHolds((previous) => ({
			...(previous.message === message
				? previous
				: { pointer: false, focus: false }),
			message,
			[kind]: held,
		}));
	const holdHandlers = hasAction
		? {
				onPointerEnter: () => setHold('pointer', true),
				onPointerLeave: () => setHold('pointer', false),
				onFocus: () => setHold('focus', true),
				onBlur: () => setHold('focus', false),
			}
		: {};

	return (
		<div className="modula-admin-toast-region" role="status">
			{'' !== message ? (
				<div
					className={`modula-admin-toast is-${tone}`}
					{...holdHandlers}
				>
					{'error' === tone ? <InfoIcon /> : <CheckIcon size={15} />}
					{message}
					{hasAction ? (
						<button
							type="button"
							className="modula-admin-toast__action"
							onClick={() => {
								action.onClick();
								dismissRef.current();
							}}
						>
							{action.label}
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);
}
