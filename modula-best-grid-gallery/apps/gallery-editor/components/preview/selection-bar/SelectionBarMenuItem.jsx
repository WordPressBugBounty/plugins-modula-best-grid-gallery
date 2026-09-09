/**
 * Menu row: optional icon + label + optional trailing count.
 */
import { Icon } from '@wordpress/icons';

/**
 * @param {{
 *   icon?: import('react').ReactElement,
 *   iconClassName?: string,
 *   children: import('react').ReactNode,
 *   count?: string,
 *   onClick?: (event: import('react').MouseEvent) => void,
 *   disabled?: boolean,
 *   className?: string,
 * }} props
 */
export default function SelectionBarMenuItem({
	icon,
	iconClassName = '',
	children,
	count,
	onClick,
	disabled = false,
	className = '',
}) {
	const classes = [
		'modula-gallery-takeover__selection-bar-menu-item',
		className.trim(),
	]
		.filter(Boolean)
		.join(' ');

	const iconClasses = [
		'modula-gallery-takeover__selection-bar-menu-item-icon',
		iconClassName.trim(),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			type="button"
			role="menuitem"
			className={classes}
			disabled={disabled}
			onClick={onClick}
		>
			{icon ? (
				<span className={iconClasses} aria-hidden="true">
					<Icon icon={icon} size={14} />
				</span>
			) : null}
			<span className="modula-gallery-takeover__selection-bar-menu-item-label">
				{children}
			</span>
			{count ? (
				<span className="modula-gallery-takeover__selection-bar-menu-item-count">
					{count}
				</span>
			) : null}
		</button>
	);
}
