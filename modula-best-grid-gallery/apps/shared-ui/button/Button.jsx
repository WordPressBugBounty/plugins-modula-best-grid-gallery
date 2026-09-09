import {
	forwardRef,
	useCallback,
	useEffect,
	useState,
} from '@wordpress/element';

/**
 * @typedef {'primary' | 'ghost' | 'plain' | 'panel'} ButtonVariant
 */

/**
 * @param {Object}        props
 * @param {ButtonVariant} [props.variant='ghost']
 * @param {boolean}       [props.mini]
 * @param {boolean}       [props.disabled]
 * @param {string}        [props.href] When set, renders an `<a>` (ignored when disabled).
 * @param {import('react').ReactNode} [props.confirm] When set, first click arms the button and
 *   shows this label; second click fires `onClick`. Ignored when `href` is set.
 * @param {string}        [props.className]
 * @param {'button'|'submit'|'reset'} [props.type]
 * @param {import('react').ReactNode} props.children
 * @param {Function}      [props.onClick]
 * @param {Function}      [props.onBlur]
 * @param {Function}      [props.onKeyDown]
 */
export const Button = forwardRef(function Button(
	{
		variant = 'ghost',
		mini = false,
		disabled = false,
		href,
		confirm,
		className = '',
		type = 'button',
		children,
		onClick,
		onBlur,
		onKeyDown,
		...rest
	},
	ref
) {
	const [armed, setArmed] = useState(false);
	const hasHref = typeof href === 'string' && href !== '';
	const confirmEnabled =
		!hasHref &&
		confirm !== undefined &&
		confirm !== null &&
		confirm !== false &&
		confirm !== '';

	useEffect(() => {
		setArmed(false);
	}, [children, confirm, disabled]);

	const handleClick = useCallback(
		(event) => {
			if (disabled) {
				return;
			}
			if (confirmEnabled && !armed) {
				event.preventDefault();
				event.stopPropagation();
				setArmed(true);
				return;
			}
			if (confirmEnabled && armed) {
				setArmed(false);
			}
			onClick?.(event);
		},
		[armed, confirmEnabled, disabled, onClick]
	);

	const handleBlur = useCallback(
		(event) => {
			if (armed) {
				setArmed(false);
			}
			onBlur?.(event);
		},
		[armed, onBlur]
	);

	const handleKeyDown = useCallback(
		(event) => {
			if (armed && event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				setArmed(false);
			}
			onKeyDown?.(event);
		},
		[armed, onKeyDown]
	);

	const classes = [
		'modula-ui-button',
		`modula-ui-button--${variant}`,
		mini ? 'modula-ui-button--mini' : '',
		disabled ? 'is-disabled' : '',
		confirmEnabled && armed ? 'is-confirm-armed' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const label = confirmEnabled && armed ? confirm : children;

	if (hasHref) {
		if (disabled) {
			return (
				<span
					ref={ref}
					className={classes}
					aria-disabled="true"
					{...rest}
				>
					{children}
				</span>
			);
		}

		return (
			<a ref={ref} href={href} className={classes} {...rest}>
				{children}
			</a>
		);
	}

	return (
		<button
			ref={ref}
			type={type}
			className={classes}
			disabled={disabled}
			aria-pressed={confirmEnabled ? armed : undefined}
			onClick={handleClick}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			{...rest}
		>
			{label}
		</button>
	);
});
