/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @param {string|number} [props.count]
 * @param {boolean} [props.active]
 * @param {Function} [props.onClick]
 * @param {Function} [props.onDismiss] When set, shows a dismiss control.
 * @param {string} [props.dismissLabel]
 * @param {boolean} [props.disabled]
 * @param {string} [props.className]
 */
export function Chip({
	children,
	count,
	active = false,
	onClick,
	onDismiss,
	dismissLabel = 'Remove',
	disabled = false,
	className = '',
	...rest
}) {
	const interactive = typeof onClick === 'function';
	const dismissible = typeof onDismiss === 'function';
	const classes = [
		'modula-ui-chip',
		active ? 'is-active' : '',
		interactive ? 'is-interactive' : '',
		dismissible ? 'is-dismissible' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	const countNode =
		count !== undefined && count !== null ? (
			<span className="modula-ui-chip__count">{count}</span>
		) : null;

	const dismissNode = dismissible ? (
		<button
			type="button"
			className="modula-ui-chip__dismiss"
			disabled={disabled}
			aria-label={dismissLabel}
			onClick={(event) => {
				event.stopPropagation();
				if (!disabled) {
					onDismiss(event);
				}
			}}
		>
			<span aria-hidden="true">×</span>
		</button>
	) : null;

	/* Dismissible chips cannot wrap a nested <button>; use a span shell. */
	if (dismissible) {
		return (
			<span className={classes} {...rest}>
				{interactive ? (
					<button
						type="button"
						className="modula-ui-chip__body"
						disabled={disabled}
						onClick={onClick}
					>
						<span className="modula-ui-chip__label">
							{children}
						</span>
						{countNode}
					</button>
				) : (
					<span className="modula-ui-chip__body">
						<span className="modula-ui-chip__label">
							{children}
						</span>
						{countNode}
					</span>
				)}
				{dismissNode}
			</span>
		);
	}

	if (interactive) {
		return (
			<button
				type="button"
				className={classes}
				disabled={disabled}
				onClick={onClick}
				{...rest}
			>
				<span className="modula-ui-chip__label">{children}</span>
				{countNode}
			</button>
		);
	}

	return (
		<span className={classes} {...rest}>
			<span className="modula-ui-chip__label">{children}</span>
			{countNode}
		</span>
	);
}
