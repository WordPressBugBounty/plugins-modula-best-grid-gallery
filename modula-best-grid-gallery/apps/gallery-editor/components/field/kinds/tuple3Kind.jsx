/**
 * Three breakpoint values (desktop / tablet / mobile) — device tabs + shared-ui Slider.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Slider, Tabs } from 'shared-ui';

/**
 * @param {unknown} current
 * @param {unknown} defaultValue
 * @return {boolean}
 */
function differsFromDefault(current, defaultValue) {
	if (current === defaultValue) {
		return false;
	}
	const a = Number(current);
	const b = Number(defaultValue);
	if (Number.isFinite(a) && Number.isFinite(b)) {
		return a !== b;
	}
	return String(current ?? '') !== String(defaultValue ?? '');
}

/**
 * @param {string} key
 * @return {string}
 */
function breakpointLabel(key) {
	const k = String(key).toLowerCase();
	if (k === 'desktop') {
		return __('Desktop', 'modula-best-grid-gallery');
	}
	if (k === 'tablet') {
		return __('Tablet', 'modula-best-grid-gallery');
	}
	if (k === 'mobile') {
		return __('Mobile', 'modula-best-grid-gallery');
	}
	return String(key);
}

/**
 * @param {Object}   props
 * @param {Object}   props.field
 * @param {Object}   props.control
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string}   [props.help]
 */
function Tuple3DeviceTabs({ field, control, value, onChange, disabled, help }) {
	const labels = Array.isArray(control.labels)
		? control.labels
		: ['desktop', 'tablet', 'mobile'];
	const deviceKeys = labels.map((_, i) => {
		if (i === 0) {
			return 'desktop';
		}
		if (i === 1) {
			return 'tablet';
		}
		return 'mobile';
	});

	const schemaDefault = field?.schema?.default;
	const defaults = Array.isArray(control.defaults)
		? control.defaults
		: Array.isArray(schemaDefault)
			? schemaDefault
			: [0, 0, 0];

	const min =
		typeof control.min === 'number'
			? control.min
			: typeof field?.schema?.items?.minimum === 'number'
				? field.schema.items.minimum
				: 0;
	const max =
		typeof control.max === 'number'
			? control.max
			: typeof field?.schema?.items?.maximum === 'number'
				? field.schema.items.maximum
				: 100;
	const step = typeof control.step === 'number' ? control.step : 1;

	const arr = Array.isArray(value) ? [...value] : [...defaults];
	while (arr.length < 3) {
		arr.push(Number(defaults[arr.length]) || 0);
	}

	const [activeDevice, setActiveDevice] = useState(
		deviceKeys[0] || 'desktop'
	);
	const activeIndex = Math.max(0, deviceKeys.indexOf(activeDevice));
	const activeValue = Number(arr[activeIndex]);
	const safeValue = Number.isFinite(activeValue)
		? activeValue
		: Number(defaults[activeIndex]) || min;

	const options = labels.map((label, i) => {
		const key = deviceKeys[i];
		const def = defaults[i];
		return {
			value: key,
			label: breakpointLabel(label),
			dirty: differsFromDefault(arr[i], def),
		};
	});

	const stackTitle =
		typeof field?.editorLabel === 'string' && field.editorLabel !== ''
			? field.editorLabel
			: __('Breakpoint values', 'modula-best-grid-gallery');

	return (
		<div className="modula-settings-editor__tuple3-device-tabs">
			<Tabs
				options={options}
				value={activeDevice}
				onChange={setActiveDevice}
				disabled={disabled}
				aria-label={stackTitle}
			/>
			<Slider
				value={safeValue}
				onChange={(n) => {
					const next = [...arr];
					next[activeIndex] = n;
					onChange(next);
				}}
				min={min}
				max={max}
				step={step}
				disabled={disabled}
				help={help}
			/>
		</div>
	);
}

/**
 * @param {Object}           ctx
 * @param {Object}           ctx.field
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderTuple3Kind(ctx) {
	return (
		<Tuple3DeviceTabs
			field={ctx.field}
			control={ctx.control || {}}
			value={ctx.value}
			onChange={ctx.onChange}
			disabled={ctx.disabled}
			help={ctx.help}
		/>
	);
}
