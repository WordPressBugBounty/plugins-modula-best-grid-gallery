import { InfoIcon, WarningIcon } from '../icons/icons';

/**
 * @typedef {'warning' | 'error'} NoticeTone
 */

/**
 * A tinted message inside a card ("Claude works only with a public site on
 * HTTPS."). `warning` is the artboard's amber note; `error` reports a failed
 * action. The icon is decorative. Pass `role="alert"` for an error that
 * appears after an action.
 *
 * @param {Object}                    props
 * @param {NoticeTone}                [props.tone='warning']
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Notice({
	tone = 'warning',
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
		</div>
	);
}
