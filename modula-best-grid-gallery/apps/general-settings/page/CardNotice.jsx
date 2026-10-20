import { Notice } from 'admin-ui';

/**
 * A notice inside a card body, spaced like a row (a failed action, a note
 * about the chosen assistant). Other props go to the Notice.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function CardNotice({ children, ...rest }) {
	return (
		<div className="modula-settings-card-notice">
			<Notice {...rest}>{children}</Notice>
		</div>
	);
}
