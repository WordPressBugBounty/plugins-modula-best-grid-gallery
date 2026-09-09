/**
 * Quiet selection-bar action: optional icon + label + optional chevron.
 */
import { Button } from 'shared-ui';
import { Icon } from '@wordpress/icons';
import { selectionBarChevronIcon } from './selectionBarIcons';

/**
 * @param {{
 *   icon?: import('react').ReactElement,
 *   children: import('react').ReactNode,
 *   disabled?: boolean,
 *   danger?: boolean,
 *   chevron?: boolean,
 *   confirm?: import('react').ReactNode,
 *   title?: string,
 *   'aria-haspopup'?: string | boolean,
 *   'aria-expanded'?: boolean,
 *   onClick?: (event: import('react').MouseEvent) => void,
 *   className?: string,
 * }} props
 */
export default function SelectionBarActionButton({
	icon,
	children,
	disabled = false,
	danger = false,
	chevron = false,
	confirm,
	title,
	'aria-haspopup': ariaHaspopup,
	'aria-expanded': ariaExpanded,
	onClick,
	className = '',
}) {
	const classes = [
		'modula-gallery-takeover__selection-bar-act',
		danger ? 'is-danger' : '',
		className.trim(),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<Button
			type="button"
			variant="plain"
			mini
			className={classes}
			disabled={disabled}
			confirm={confirm}
			title={title}
			aria-haspopup={ariaHaspopup}
			aria-expanded={ariaExpanded}
			onClick={onClick}
		>
			{icon ? (
				<span
					className="modula-gallery-takeover__selection-bar-act-icon"
					aria-hidden="true"
				>
					<Icon icon={icon} size={14} />
				</span>
			) : null}
			<span className="modula-gallery-takeover__selection-bar-act-label">
				{children}
			</span>
			{chevron ? (
				<span
					className="modula-gallery-takeover__selection-bar-act-chevron"
					aria-hidden="true"
				>
					<Icon icon={selectionBarChevronIcon} size={10} />
				</span>
			) : null}
		</Button>
	);
}
