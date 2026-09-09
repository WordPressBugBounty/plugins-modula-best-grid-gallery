import { forwardRef } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {string}   [props.label] Accessible label (required for icon-only)
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.className]
 * @param {import('react').ReactNode} props.children
 * @param {Function} [props.onClick]
 */
export const IconButton = forwardRef(function IconButton(
	{
		label,
		disabled = false,
		className = '',
		children,
		onClick,
		type = 'button',
		...rest
	},
	ref
) {
	const classes = ['modula-ui-icon-button', className]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			ref={ref}
			type={type}
			className={classes}
			disabled={disabled}
			aria-label={label}
			title={label}
			onClick={onClick}
			{...rest}
		>
			{children}
		</button>
	);
});
