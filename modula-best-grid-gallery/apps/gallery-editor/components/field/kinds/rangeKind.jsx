import { Slider } from 'shared-ui';

/**
 * @param {Object}           ctx
 * @param {Object}           [ctx.field]
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderRangeKind({
	field,
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const min = control.min ?? 0;
	const max = control.max ?? 100;
	const step = typeof control.step === 'number' ? control.step : 1;
	const valueFormat = control.valueFormat;
	const schemaDefault = field?.schema?.default;
	const fallback =
		typeof control.default === 'number' && Number.isFinite(control.default)
			? control.default
			: typeof schemaDefault === 'number' &&
				  Number.isFinite(schemaDefault)
				? schemaDefault
				: min;

	let numericValue;
	if (valueFormat === 'px') {
		let raw;
		if (typeof value === 'string') {
			raw = value.trim();
		} else if (value === null || value === undefined) {
			raw = '';
		} else {
			raw = String(value);
		}
		const pxMatches =
			typeof raw === 'string' ? raw.match(/-?\d+(?:\.\d+)?px/gi) : null;
		const lastPx =
			pxMatches && pxMatches.length
				? pxMatches[pxMatches.length - 1]
				: '';
		const nFromPx = lastPx
			? parseFloat(lastPx.replace(/px/i, ''))
			: Number.NaN;
		const nBare =
			typeof raw === 'string' && /^\d+$/.test(raw)
				? parseInt(raw, 10)
				: Number.NaN;
		let parsed = Number.NaN;
		if (Number.isFinite(nFromPx)) {
			parsed = nFromPx;
		} else if (Number.isFinite(nBare)) {
			parsed = nBare;
		}
		numericValue = Number.isFinite(parsed) ? parsed : fallback;
	} else {
		numericValue = Number(value);
	}

	let safe = Number.isFinite(numericValue) ? numericValue : fallback;
	safe = Math.min(max, Math.max(min, safe));

	const emit = (v) => {
		if (valueFormat === 'px') {
			onChange(`${Math.round(v)}px`);
		} else {
			onChange(v);
		}
	};

	return (
		<Slider
			value={safe}
			onChange={emit}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			help={help}
		/>
	);
}
