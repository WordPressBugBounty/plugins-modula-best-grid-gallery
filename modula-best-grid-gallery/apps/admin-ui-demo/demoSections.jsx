// Building blocks for the admin-ui demo page. Development only: never
// imported by a product screen.

/**
 * A titled demo section.
 *
 * @param {Object}                    props
 * @param {string}                    props.title
 * @param {string}                    [props.description]
 * @param {import('react').ReactNode} props.children
 */
export function DemoSection({ title, description = '', children }) {
	return (
		<section className="modula-admin-demo__section">
			<h2 className="modula-admin-demo__section-title">{title}</h2>
			{description ? (
				<p className="modula-admin-demo__section-text">{description}</p>
			) : null}
			{children}
		</section>
	);
}

/**
 * One control state with its caption. `forceFocus` draws the focus style
 * without keyboard focus, so every state is visible at once.
 *
 * @param {Object}                    props
 * @param {string}                    props.label
 * @param {boolean}                   [props.forceFocus]
 * @param {import('react').ReactNode} props.children
 */
export function DemoState({ label, forceFocus = false, children }) {
	const classes = [
		'modula-admin-demo__state',
		forceFocus ? 'is-force-focus' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<figure className={classes}>
			<div className="modula-admin-demo__state-body">{children}</div>
			<figcaption className="modula-admin-demo__state-label">
				{label}
			</figcaption>
		</figure>
	);
}

/**
 * Lays out DemoState items in a wrapping row.
 *
 * @param {Object}                    props
 * @param {import('react').ReactNode} props.children
 */
export function DemoStates({ children }) {
	return <div className="modula-admin-demo__states">{children}</div>;
}
