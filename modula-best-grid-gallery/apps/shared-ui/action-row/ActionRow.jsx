/**
 * Horizontal row of actions (typically ghost Buttons). Layout only.
 *
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 */
export function ActionRow({ children, className = '', ...rest }) {
	const classes = ['modula-ui-action-row', className]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} {...rest}>
			{children}
		</div>
	);
}
