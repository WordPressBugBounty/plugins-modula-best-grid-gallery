import { Field, useField } from './Field';

/**
 * Single-line text field. Name it with `<label htmlFor={id}>` (SettingsRow
 * does this) or `aria-label`.
 *
 * @param {Object}         props
 * @param {string}         props.value
 * @param {Function}       props.onChange             Receives the string value.
 * @param {string}         [props.type='text']
 * @param {string}         [props.error]              Shows the message and marks the field invalid.
 * @param {'field'|'full'} [props.width]
 * @param {boolean}        [props.disabled]
 * @param {string}         [props.id]
 * @param {string}         [props.className]
 * @param {string}         [props.'aria-describedby'] Extra description ids, joined with the error id.
 */
export function TextInput({
	value = '',
	onChange,
	type = 'text',
	error = '',
	width,
	disabled = false,
	id,
	className = '',
	'aria-describedby': describedBy,
	...rest
}) {
	const { errorId, hasError, controlProps } = useField({
		id,
		error,
		describedBy,
	});

	return (
		<Field
			errorId={errorId}
			hasError={hasError}
			error={error}
			width={width}
		>
			<input
				{...controlProps}
				type={type}
				className={['modula-admin-text-input', className]
					.filter(Boolean)
					.join(' ')}
				value={value}
				disabled={disabled}
				onChange={(event) => onChange?.(event.target.value)}
				{...rest}
			/>
		</Field>
	);
}
