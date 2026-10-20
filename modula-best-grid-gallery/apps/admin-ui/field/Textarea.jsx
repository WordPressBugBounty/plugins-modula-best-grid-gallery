import { Field, useField } from './Field';

/**
 * Multi-line text field, always full width. Name it with `<label htmlFor={id}>`
 * (SettingsRow `stacked` does this) or `aria-label`.
 *
 * @param {Object}   props
 * @param {string}   props.value
 * @param {Function} props.onChange             Receives the string value.
 * @param {number}   [props.rows=4]
 * @param {string}   [props.error]              Shows the message and marks the field invalid.
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.id]
 * @param {string}   [props.className]
 * @param {string}   [props.'aria-describedby'] Extra description ids, joined with the error id.
 */
export function Textarea({
	value = '',
	onChange,
	rows = 4,
	error = '',
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
		<Field errorId={errorId} hasError={hasError} error={error} width="full">
			<textarea
				{...controlProps}
				rows={rows}
				className={['modula-admin-textarea', className]
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
