import { useId } from '@wordpress/element';

/**
 * @param {Object}   props
 * @param {number}   props.value
 * @param {Function} props.onChange Receives number
 * @param {number}   [props.min=0]
 * @param {number}   [props.max=100]
 * @param {number}   [props.step=1]
 * @param {boolean}  [props.disabled]
 * @param {boolean}  [props.showNumber=true]
 * @param {string}   [props.help]
 * @param {string}   [props.className]
 * @param {string}   [props.id]
 */
export function Slider({
	value,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	disabled = false,
	showNumber = true,
	help,
	className = '',
	id: idProp,
}) {
	const genId = useId();
	const id = idProp || `modula-ui-slider-${genId}`;
	const safeMin = Number(min);
	const safeMax = Number(max);
	const numeric = Number(value);
	const safe = Number.isFinite(numeric)
		? Math.min(safeMax, Math.max(safeMin, numeric))
		: safeMin;
	const classes = ['modula-ui-slider', className].filter(Boolean).join(' ');

	const emit = (raw) => {
		if (typeof onChange !== 'function') {
			return;
		}
		const n = Number(raw);
		if (!Number.isFinite(n)) {
			return;
		}
		onChange(Math.min(safeMax, Math.max(safeMin, n)));
	};

	return (
		<div className={classes}>
			<div className="modula-ui-slider__row">
				<div className="modula-ui-slider__track-wrap">
					<input
						id={id}
						type="range"
						className="modula-ui-slider__input"
						min={safeMin}
						max={safeMax}
						step={step}
						value={safe}
						disabled={disabled}
						aria-valuemin={safeMin}
						aria-valuemax={safeMax}
						aria-valuenow={safe}
						onChange={(e) => emit(e.target.value)}
					/>
				</div>
				{showNumber ? (
					<input
						type="number"
						className="modula-ui-slider__number"
						min={safeMin}
						max={safeMax}
						step={step}
						value={safe}
						disabled={disabled}
						aria-label="Value"
						onChange={(e) => emit(e.target.value)}
					/>
				) : null}
			</div>
			{help ? <p className="modula-ui-slider__help">{help}</p> : null}
		</div>
	);
}
