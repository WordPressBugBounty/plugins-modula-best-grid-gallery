/**
 * A field's first validation error, once the field was touched.
 *
 * @param {{ fieldApi: { state: { meta: { isTouched?: boolean; errors?: string[] } } } } } props
 */
export function FieldValidationError({ fieldApi }) {
	const meta = fieldApi.state.meta;
	if (!meta.isTouched || !meta.errors?.length) {
		return null;
	}
	return (
		<p
			className="modula-gallery-takeover__hover-builder-error"
			role="alert"
		>
			{meta.errors[0]}
		</p>
	);
}
