import { __ } from '@wordpress/i18n';
import { IconButton } from '../icon-button/IconButton';

/**
 * Clockwise arrow — restore schema default.
 *
 * @param {Object} props
 * @param {Function} [props.onClick]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 * @param {string} [props.label]
 */
export function ResetToDefaultButton({
	onClick,
	disabled = false,
	className = '',
	label,
	...rest
}) {
	const classes = ['modula-ui-reset-to-default', className]
		.filter(Boolean)
		.join(' ');
	const ariaLabel =
		typeof label === 'string' && label.trim() !== ''
			? label
			: __('Reset to default', 'modula-best-grid-gallery');

	return (
		<IconButton
			className={classes}
			label={ariaLabel}
			disabled={disabled}
			onClick={onClick}
			{...rest}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="14"
				height="14"
				aria-hidden="true"
				focusable="false"
			>
				<path
					fill="currentColor"
					d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
				/>
			</svg>
		</IconButton>
	);
}
