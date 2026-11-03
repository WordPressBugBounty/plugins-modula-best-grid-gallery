/**
 * Three breakpoint values (desktop / tablet / mobile): the device switch
 * picks which value the slider edits.
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Range } from 'admin-ui';
import DeviceSwitch, { DEVICE_KEYS, deviceLabel } from '../DeviceSwitch';
import { ControlHelp, describedByHelp } from './ControlHelp';
import { rangeUnit } from './rangeKind';

/**
 * @param {Object} control
 * @param {Object} [field]
 * @return {{ min: number, max: number, step: number }} Slider bounds.
 */
function tupleBounds(control, field) {
	const items = field?.schema?.items;
	let min = 0;
	if (typeof control.min === 'number') {
		min = control.min;
	} else if (typeof items?.minimum === 'number') {
		min = items.minimum;
	}
	let max = 100;
	if (typeof control.max === 'number') {
		max = control.max;
	} else if (typeof items?.maximum === 'number') {
		max = items.maximum;
	}

	return {
		min,
		max,
		step: typeof control.step === 'number' ? control.step : 1,
	};
}

/**
 * @param {Object} control
 * @param {Object} [field]
 * @return {Array<number|string>} Default per device.
 */
function tupleDefaults(control, field) {
	if (Array.isArray(control.defaults)) {
		return control.defaults;
	}
	const schemaDefault = field?.schema?.default;

	return Array.isArray(schemaDefault) ? schemaDefault : [0, 0, 0];
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} props
 */
function Tuple3DeviceControl({
	field,
	control,
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	const labels = Array.isArray(control.labels) ? control.labels : DEVICE_KEYS;
	const devices = labels.map((name, i) => ({
		value: DEVICE_KEYS[Math.min(i, DEVICE_KEYS.length - 1)],
		label: deviceLabel(name),
	}));
	const defaults = tupleDefaults(control, field);
	const { min, max, step } = tupleBounds(control, field);

	const arr = Array.isArray(value) ? [...value] : [...defaults];
	while (arr.length < 3) {
		arr.push(Number(defaults[arr.length]) || 0);
	}

	const [activeDevice, setActiveDevice] = useState(
		devices[0]?.value ?? 'desktop'
	);
	const activeIndex = Math.max(
		0,
		devices.findIndex((device) => device.value === activeDevice)
	);
	const activeValue = Number(arr[activeIndex]);
	const safeValue = Number.isFinite(activeValue)
		? activeValue
		: Number(defaults[activeIndex]) || min;

	const stackTitle =
		typeof field?.editorLabel === 'string' && field.editorLabel !== ''
			? field.editorLabel
			: __('Breakpoint values', 'modula-best-grid-gallery');

	return (
		<div className="modula-settings-editor__tuple3-device-tabs">
			<DeviceSwitch
				devices={devices}
				value={activeDevice}
				onChange={setActiveDevice}
				disabled={disabled}
				label={stackTitle}
			/>
			<Range
				id={controlId}
				value={safeValue}
				onChange={(n) => {
					const next = [...arr];
					next[activeIndex] = n;
					onChange(next);
				}}
				min={min}
				max={max}
				step={step}
				unit={rangeUnit(control)}
				disabled={disabled}
				aria-describedby={describedByHelp(controlId, help)}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</div>
	);
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderTuple3Kind(ctx) {
	return <Tuple3DeviceControl {...ctx} control={ctx.control || {}} />;
}
