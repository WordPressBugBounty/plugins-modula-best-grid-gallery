/**
 * @param {Object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.as] Element tag, default h3
 */
export function SectionHeading({
	children,
	className = '',
	as: Tag = 'h3',
	...rest
}) {
	const classes = ['modula-ui-section-heading', className]
		.filter(Boolean)
		.join(' ');

	return (
		<Tag className={classes} {...rest}>
			{children}
		</Tag>
	);
}
