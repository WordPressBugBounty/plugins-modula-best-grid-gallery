// The statuses with their own dot; any other draws the neutral grey one.
const STATUS_DOT_VARIANTS = ['publish', 'draft', 'private', 'trash'];

/**
 * A status as a dot and its label (a Status column cell): green for
 * `publish`, a hollow ring for `draft`, dark grey for `private`, pale grey
 * for `trash`. The dot is decorative; the label says the status. `hint` is a
 * muted second line that starts under the dot (the password hint).
 *
 * @param {Object}                    props
 * @param {string}                    props.status  A WordPress post status.
 * @param {import('react').ReactNode} [props.label] Without it, only the dot (a menu option's icon).
 * @param {import('react').ReactNode} [props.hint]
 */
export function StatusDot({ status, label = null, hint = null }) {
	const variant = STATUS_DOT_VARIANTS.includes(status) ? status : null;

	return (
		<span
			className={[
				'modula-admin-status-dot',
				variant ? `is-${variant}` : '',
			]
				.filter(Boolean)
				.join(' ')}
		>
			<span className="modula-admin-status-dot__dot" aria-hidden="true" />
			{label ? (
				<span className="modula-admin-status-dot__label">{label}</span>
			) : null}
			{hint ? (
				<span className="modula-admin-status-dot__hint">{hint}</span>
			) : null}
		</span>
	);
}
