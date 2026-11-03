/**
 * Page container that scopes admin-ui tokens. Every admin-ui control must
 * render inside it; tokens are not defined anywhere else.
 *
 * The page resolves its appearance (a stored "system" preference becomes
 * light or dark) and passes the result; admin-ui keeps no preference.
 *
 * @param {Object}                    props
 * @param {'light' | 'dark'}          [props.appearance] Resolved appearance.
 * @param {string}                    [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function AdminUiRoot({
	appearance = 'light',
	className = '',
	children,
}) {
	const classes = [
		'modula-admin-ui',
		'dark' === appearance ? 'is-dark' : '',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return <div className={classes}>{children}</div>;
}
