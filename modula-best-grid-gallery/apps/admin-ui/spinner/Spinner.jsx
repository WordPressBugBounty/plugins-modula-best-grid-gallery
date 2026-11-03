/**
 * A turning ring while something loads. It is decorative (`aria-hidden`);
 * the caller puts it in a `role="status"` region with the loading text,
 * or names that region. With reduced motion it stands still.
 *
 * @param {Object} props
 * @param {number} [props.size] Diameter in px.
 */
export function Spinner({ size = 18 }) {
	return (
		<span
			className="modula-admin-spinner"
			style={{ width: size, height: size }}
			aria-hidden="true"
		/>
	);
}
