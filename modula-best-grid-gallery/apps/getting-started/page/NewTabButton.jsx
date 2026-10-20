import { __ } from '@wordpress/i18n';
import { Button, ExternalIcon } from 'admin-ui';

/**
 * A link styled as a button that opens a site outside wp-admin in a new tab,
 * marked as such for sighted and screen reader users.
 *
 * @param {Object}                                         props
 * @param {string}                                         props.href
 * @param {import('admin-ui/button/Button').ButtonVariant} [props.variant]
 * @param {import('react').ReactNode}                      props.children  Label.
 *                                                                         Other props (ARIA) go to the link.
 */
export function NewTabButton({
	href,
	variant = 'secondary',
	children,
	...rest
}) {
	return (
		<Button
			{...rest}
			variant={variant}
			href={href}
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
			<ExternalIcon />
			<span className="modula-admin-sr-only">
				{__('(opens in a new tab)', 'modula-best-grid-gallery')}
			</span>
		</Button>
	);
}
