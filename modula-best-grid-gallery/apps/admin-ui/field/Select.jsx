import { Field, useField } from './Field';

/**
 * @typedef {{ value: string, label: string, disabled?: boolean }} SelectOption
 */

/**
 * Native select with the design's chevron. Name it with `<label htmlFor={id}>`
 * (SettingsRow does this) or `aria-label`.
 *
 * @param {Object}         props
 * @param {SelectOption[]} props.options
 * @param {string}         props.value
 * @param {Function}       props.onChange             Receives the option value.
 * @param {string}         [props.error]              Shows the message and marks the field invalid.
 * @param {'field'|'full'} [props.width]
 * @param {boolean}        [props.disabled]
 * @param {string}         [props.id]
 * @param {string}         [props.className]
 * @param {string}         [props.'aria-describedby'] Extra description ids, joined with the error id.
 */
export function Select({
	options = [],
	value,
	onChange,
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
			<select
				{...controlProps}
				className={['modula-admin-select', className]
					.filter(Boolean)
					.join(' ')}
				value={value}
				disabled={disabled}
				onChange={(event) => onChange?.(event.target.value)}
				{...rest}
			>
				{options.map((option) => (
					<option
						key={String(option.value)}
						value={option.value}
						disabled={option.disabled === true}
					>
						{option.label}
					</option>
				))}
			</select>
		</Field>
	);
}
