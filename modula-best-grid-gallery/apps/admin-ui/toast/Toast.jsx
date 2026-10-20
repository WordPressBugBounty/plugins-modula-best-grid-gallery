import { useEffect, useRef } from '@wordpress/element';
import { CheckIcon, InfoIcon } from '../icons/icons';

/**
 * @typedef {'success' | 'error'} ToastTone
 */

// An error stays longer: it has to be read, and it usually asks for action.
const DISMISS_AFTER_MS = {
	success: 3500,
	error: 8000,
};

/**
 * Message at the bottom of the viewport: a confirmation ("Settings saved")
 * or, with `tone="error"`, a failure. The live region stays mounted so each
 * message is announced politely; the toast calls `onDismiss` after a few
 * seconds, and the parent clears `message`. A message is announced when it
 * changes, so clear it before repeating the same text (start of a new save).
 *
 * @param {Object}    props
 * @param {string}    props.message   Empty for no toast.
 * @param {Function}  props.onDismiss Called when the message should go.
 * @param {ToastTone} [props.tone]
 */
export function Toast({ message, onDismiss, tone = 'success' }) {
	// The timer restarts per message, not whenever the parent re-renders
	// with a new callback.
	const dismissRef = useRef(onDismiss);

	useEffect(() => {
		dismissRef.current = onDismiss;
	}, [onDismiss]);

	useEffect(() => {
		if ('' === message) {
			return undefined;
		}
		const timer = window.setTimeout(
			() => dismissRef.current(),
			DISMISS_AFTER_MS[tone]
		);

		return () => window.clearTimeout(timer);
	}, [message, tone]);

	return (
		<div className="modula-admin-toast-region" role="status">
			{'' !== message ? (
				<div className={`modula-admin-toast is-${tone}`}>
					{'error' === tone ? <InfoIcon /> : <CheckIcon size={15} />}
					{message}
				</div>
			) : null}
		</div>
	);
}
