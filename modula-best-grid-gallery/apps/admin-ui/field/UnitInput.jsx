import { Field, joinIds, useField } from './Field';

/**
 * A number with its unit in one field ("100 %", gallery width). The number
 * is free text with a decimal keypad, so the caller keeps what is typed and
 * validates it; the unit is fixed text after it, which also describes the
 * number. Name the number with `<label htmlFor={id}>` (SettingsRow does
 * this) or `aria-label`.
 *
 * @param {Object}         props
 * @param {string}         props.value                Number as typed.
 * @param {Function}       props.onChange             Receives the text.
 * @param {string}         props.unit                 Shown after the number.
 * @param {string}         [props.error]              Shows the message and marks the field invalid.
 * @param {'field'|'full'} [props.width]
 * @param {boolean}        [props.disabled]
 * @param {string}         [props.id]
 * @param {string}         [props.className]
 * @param {string}         [props.'aria-describedby'] Extra description ids, joined with the error and unit ids.
 */
export function UnitInput({
	value = '',
	onChange,
	unit,
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
	const unitId = `${controlProps.id}-unit`;

	return (
		<Field
			errorId={errorId}
			hasError={hasError}
			error={error}
			width={width}
		>
			<span
				className={[
					'modula-admin-unit-input',
					hasError ? 'is-invalid' : '',
					disabled ? 'is-disabled' : '',
					className,
				]
					.filter(Boolean)
					.join(' ')}
			>
				<input
					{...controlProps}
					aria-describedby={joinIds(
						controlProps['aria-describedby'],
						unitId
					)}
					type="text"
					inputMode="decimal"
					className="modula-admin-unit-input__number"
					value={value}
					disabled={disabled}
					onChange={(event) => onChange?.(event.target.value)}
					{...rest}
				/>
				<span id={unitId} className="modula-admin-unit-input__unit">
					{unit}
				</span>
			</span>
		</Field>
	);
}
