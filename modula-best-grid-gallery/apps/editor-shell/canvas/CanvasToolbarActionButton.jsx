/**
 * Quiet canvas-toolbar action: icon + label (Select multiple / Bulk edit / Sort).
 * Icons must use currentColor so fill/stroke match the button ink.
 */
import { Icon } from '@wordpress/icons';

/**
 * Other props (a Popover trigger's `aria-expanded`, `aria-controls`,
 * `onKeyDown`) go to the button.
 *
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
	...rest
}) {
	const classes = ['modula-takeover__canvas-toolbar-action', className.trim()]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			type="button"
			className={classes}
			disabled={disabled}
			aria-pressed={ariaPressed}
			onClick={onClick}
			{...rest}
		>
			<span
				className="modula-takeover__canvas-toolbar-action-icon"
				aria-hidden="true"
			>
				<Icon icon={icon} size={16} />
			</span>
			<span className="modula-takeover__canvas-toolbar-action-label">
				{children}
			</span>
		</button>
	);
}
