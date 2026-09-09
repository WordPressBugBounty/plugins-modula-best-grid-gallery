/**
 * Quiet canvas-toolbar action: icon + label (Select all / Bulk edit / Sort).
 * Icons must use currentColor so fill/stroke match the button ink.
 */
import { Button } from 'shared-ui';
import { Icon } from '@wordpress/icons';

/**
 * @param {{
 *   icon: import('react').ReactElement,
 *   children: import('react').ReactNode,
 *   disabled?: boolean,
 *   onClick?: (event: import('react').MouseEvent) => void,
 *   'aria-pressed'?: boolean,
 *   className?: string,
 * }} props
 */
export default function CanvasToolbarActionButton({
	icon,
	children,
	disabled = false,
	onClick,
	'aria-pressed': ariaPressed,
	className = '',
}) {
	const classes = [
		'modula-gallery-takeover__canvas-toolbar-action',
		className.trim(),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<Button
			type="button"
			variant="plain"
			className={classes}
			disabled={disabled}
			aria-pressed={ariaPressed}
			onClick={onClick}
		>
			<span
				className="modula-gallery-takeover__canvas-toolbar-action-icon"
				aria-hidden="true"
			>
				<Icon icon={icon} size={18} />
			</span>
			<span className="modula-gallery-takeover__canvas-toolbar-action-label">
				{children}
			</span>
		</Button>
	);
}
