import { useEffect, useId, useRef, useState } from '@wordpress/element';

import {
	createSliderNumberCommit,
	resolveSliderNumberCommit,
} from './sliderNumberCommitPolicy';

/**
 * @param {Object}   props
 * @param {number}   props.value
 * @param {Function} props.onChange          Receives number
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
	const safe = resolveSliderNumberCommit(value, safeMin, safeMax);
	const classes = ['modula-ui-slider', className].filter(Boolean).join(' ');
	const [numberDraft, setNumberDraft] = useState(null);
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const mountedRef = useRef(true);
	const prevSafeRef = useRef(safe);
	const sessionRef = useRef(null);

	if (!sessionRef.current) {
		sessionRef.current = createSliderNumberCommit({
			min: safeMin,
			max: safeMax,
			onChange: (n) => {
				if (mountedRef.current) {
					setNumberDraft(String(n));
				}
				if (typeof onChangeRef.current === 'function') {
					onChangeRef.current(n);
				}
			},
		});
	}

	sessionRef.current.setBounds(safeMin, safeMax);

	useEffect(() => {
		mountedRef.current = true;
		const session = sessionRef.current;
		return () => {
			mountedRef.current = false;
			session.flush();
		};
	}, []);

	useEffect(() => {
		if (prevSafeRef.current === safe) {
			return;
		}
		prevSafeRef.current = safe;
		sessionRef.current.cancel();
		setNumberDraft(null);
	}, [safe]);

	useEffect(() => {
		if (!disabled) {
			return;
		}
		sessionRef.current.cancel();
		setNumberDraft(null);
	}, [disabled]);

	const numberValue = numberDraft !== null ? numberDraft : safe;

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
						onChange={(e) => {
							setNumberDraft(null);
							sessionRef.current.commitNow(e.target.value);
						}}
					/>
				</div>
				{showNumber ? (
					<input
						type="number"
						className="modula-ui-slider__number"
						min={safeMin}
						max={safeMax}
						step={step}
						value={numberValue}
						disabled={disabled}
						aria-label="Value"
						onChange={(e) => {
							setNumberDraft(e.target.value);
							sessionRef.current.schedule(e.target.value);
						}}
						onBlur={() => {
							sessionRef.current.flush();
						}}
					/>
				) : null}
			</div>
			{help ? <p className="modula-ui-slider__help">{help}</p> : null}
		</div>
	);
}
