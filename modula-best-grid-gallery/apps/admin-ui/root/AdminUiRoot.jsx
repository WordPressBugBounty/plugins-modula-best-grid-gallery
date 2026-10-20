/**
 * Page container that scopes admin-ui tokens. Every admin-ui control must
 * render inside it; tokens are not defined anywhere else.
 *
 * @param {Object}                    props
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function AdminUiRoot({ className = '', children }) {
	const classes = ['modula-admin-ui', className].filter(Boolean).join(' ');

	return <div className={classes}>{children}</div>;
}
