/**
 * 20px semantic state pill (Applied / Not applied). Not a Chip (28px).
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @param {boolean} [props.active] Accent ground when true; neutral otherwise.
 * @param {string} [props.className]
 */
export function StatePill({
	children,
	active = false,
	className = '',
	...rest
}) {
	const classes = [
		'modula-ui-state-pill',
		active ? 'is-active' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<span className={classes} {...rest}>
			{children}
		</span>
	);
}
