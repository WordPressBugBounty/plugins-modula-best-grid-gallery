import { UnitSelect } from '../field/UnitSelect';

/**
 * A slider with its value read out after it ("20 px"). Name it with
 * `<label htmlFor={id}>` (SettingsRow does this) or `aria-label`; the
 * readout repeats the value for sighted users only, since the slider
 * already announces it.
 *
 * With `units` the readout becomes the editor's unit box: the value and a
 * unit menu (px, %, em…). Changing the unit only reports it; converting the
 * value and the range for the new unit is the caller's rule.
 *
 * @param {Object}        props
 * @param {number}        props.value
 * @param {Function}      props.onChange             Receives the number.
 * @param {number}        props.min
 * @param {number}        props.max
 * @param {number}        [props.step=1]
 * @param {string}        [props.unit]               Shown after the value and in `aria-valuetext`.
 * @param {string|number} [props.readout]            Read out in place of `value` ("All" for 0, or a stored value past the slider's end); the unit still follows it.
 * @param {string[]}      [props.units]              Units to choose from; shows the unit box.
 * @param {Function}      [props.onUnitChange]       Receives the chosen unit.
 * @param {string}        [props.unitLabel]          Name of the unit menu ("Margin unit"); required with `units`.
 * @param {boolean}       [props.disabled]
 * @param {string}        [props.id]
 * @param {string}        [props.className]
 * @param {string}        [props.'aria-describedby']
 */
export function Range({
	value,
	onChange,
	min,
	max,
	step = 1,
	unit = '',
	readout = value,
	units = [],
	onUnitChange,
	unitLabel = '',
	disabled = false,
	id,
	className = '',
	...rest
}) {
	const valueText = unit ? `${readout} ${unit}` : String(readout);
	const hasUnitBox = units.length > 0;
	// The filled part of the track, for the design's two-tone track.
	const filled =
		max > min
			? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
			: 0;

	return (
		<span
			className={[
				'modula-admin-range',
				hasUnitBox ? 'has-unit-box' : '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
		>
			<input
				id={id}
				type="range"
				className="modula-admin-range__input"
				min={min}
				max={max}
				step={step}
				value={value}
				disabled={disabled}
				aria-valuetext={valueText}
				style={{ '--modula-admin-range-filled': `${filled}%` }}
				onChange={(event) => onChange?.(Number(event.target.value))}
				{...rest}
			/>
			{hasUnitBox ? (
				<span className="modula-admin-range__box">
					<span aria-hidden="true">{readout}</span>
					<UnitSelect
						units={units}
						value={unit}
						onChange={onUnitChange}
						disabled={disabled}
						aria-label={unitLabel}
					/>
				</span>
			) : (
				// The unit is a styling hook for hosts; the readout's text is unchanged.
				<span className="modula-admin-range__value" aria-hidden="true">
					{readout}
					{unit ? (
						<>
							{' '}
							<span className="modula-admin-range__unit">
								{unit}
							</span>
						</>
					) : null}
				</span>
			)}
		</span>
	);
}
