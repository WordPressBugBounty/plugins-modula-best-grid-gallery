/**
 * 6px accent dot — value differs from schema default.
 *
 * @param {Object} props
 * @param {string} [props.className]
 */
export function DirtyMark({ className = '' }) {
	const classes = ['modula-ui-dirty-mark', className]
		.filter(Boolean)
		.join(' ');
	return <span className={classes} aria-hidden="true" />;
}
