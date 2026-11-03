import { __ } from '@wordpress/i18n';
import { CloseIcon, InfoIcon, WarningIcon } from '../icons/icons';

/**
 * @typedef {'warning' | 'error'} NoticeTone
 */

/**
 * A tinted message inside a card ("Claude works only with a public site on
 * HTTPS."). `warning` is the artboard's amber note; `error` reports a failed
 * action. The icon is decorative. Pass `role="alert"` for an error that
 * appears after an action. With `onDismiss` it ends with a close button;
 * the caller removes the notice.
 *
 * @param {Object}                    props
 * @param {NoticeTone}                [props.tone='warning']
 * @param {Function}                  [props.onDismiss]
 * @param {string}                    [props.dismissLabel] The close button's name.
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Notice({
	tone = 'warning',
	onDismiss,
	dismissLabel = __('Dismiss this notice', 'modula-best-grid-gallery'),
	className = '',
	children,
	...rest
}) {
	const classes = ['modula-admin-notice', `is-${tone}`, className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} {...rest}>
			{/* The artboard's amber note uses the info icon; a failure gets the warning sign. */}
			{'error' === tone ? <WarningIcon /> : <InfoIcon />}
			<div className="modula-admin-notice__body">{children}</div>
			{onDismiss ? (
				<button
					type="button"
					className="modula-admin-notice__dismiss"
					aria-label={dismissLabel}
					onClick={onDismiss}
				>
					<CloseIcon />
				</button>
			) : null}
		</div>
	);
}
