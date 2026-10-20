/**
 * A slider with its value read out after it ("20 px"). Name it with
 * `<label htmlFor={id}>` (SettingsRow does this) or `aria-label`; the
 * readout repeats the value for sighted users only, since the slider
 * already announces it.
 *
 * @param {Object}   props
 * @param {number}   props.value
 * @param {Function} props.onChange             Receives the number.
 * @param {number}   props.min
 * @param {number}   props.max
 * @param {number}   [props.step=1]
 * @param {string}   [props.unit]               Shown after the value and in `aria-valuetext`.
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.id]
 * @param {string}   [props.className]
 * @param {string}   [props.'aria-describedby']
 */
export function Range({
	value,
	onChange,
	min,
	max,
	step = 1,
	unit = '',
	disabled = false,
	id,
	className = '',
	...rest
}) {
	const readout = unit ? `${value} ${unit}` : String(value);
	// The filled part of the track, for the design's two-tone track.
	const filled = max > min ? ((value - min) / (max - min)) * 100 : 0;

	return (
		<span
			className={['modula-admin-range', className]
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
				aria-valuetext={readout}
				style={{ '--modula-admin-range-filled': `${filled}%` }}
				onChange={(event) => onChange?.(Number(event.target.value))}
				{...rest}
			/>
			<span className="modula-admin-range__value" aria-hidden="true">
				{readout}
			</span>
		</span>
	);
}
