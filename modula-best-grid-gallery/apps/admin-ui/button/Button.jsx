/**
 * @typedef {'primary' | 'secondary' | 'ghost' | 'danger' | 'link'} ButtonVariant
 */

/**
 * Action button. `primary` is the dark fill, `secondary` the outlined white
 * button, `ghost` the plain text action (Cancel), `danger` the plain red
 * text action (Disconnect), `link` the
 * underlined text action (Clear activity). With `href` it
 * renders a link styled as a button; a disabled link renders as a disabled
 * button so it cannot be followed.
 *
 * @param {Object}                    props
 * @param {ButtonVariant}             [props.variant='secondary']
 * @param {import('react').ReactNode} [props.icon]                Decorative icon before the label.
 * @param {string}                    [props.href]
 * @param {boolean}                   [props.disabled]
 * @param {'button'|'submit'|'reset'} [props.type='button']
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function Button({
	variant = 'secondary',
	icon = null,
	href,
	disabled = false,
	type = 'button',
	className = '',
	children,
	...rest
}) {
	const classes = ['modula-admin-button', `is-${variant}`, className]
		.filter(Boolean)
		.join(' ');
	const content = (
		<>
			{icon ? (
				<span className="modula-admin-button__icon" aria-hidden="true">
					{icon}
				</span>
			) : null}
			{children}
		</>
	);
	const isLink = typeof href === 'string' && '' !== href && !disabled;

	if (isLink) {
		return (
			<a className={classes} href={href} {...rest}>
				{content}
			</a>
		);
	}

	return (
		<button type={type} className={classes} disabled={disabled} {...rest}>
			{content}
		</button>
	);
}
