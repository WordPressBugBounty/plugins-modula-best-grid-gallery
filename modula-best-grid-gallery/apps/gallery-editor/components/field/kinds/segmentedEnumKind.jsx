import { Segmented } from 'admin-ui';
import { isNil } from '../../../logic/isNil';
import { ControlHelp } from './ControlHelp';

/**
 * Two-or-more-option segmented control for enum fields. Option descriptions
 * are not drawn under the control: help lives in the row's ⓘ tip (canvas).
 *
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderSegmentedEnumKind({
	control,
	controlId,
	label,
	value,
	onChange,
	disabled,
	help,
}) {
	const labels = control.optionLabels || {};
	const options = Array.isArray(control.options) ? control.options : [];
	const current =
		isNil(value) || value === '' ? String(options[0] ?? '') : String(value);

	const segmentedOptions = options.map((option) => {
		const key = String(option);
		const rawLabel = Array.isArray(labels)
			? labels[options.indexOf(option)]
			: (labels[key] ?? labels[option] ?? key);
		const optionLabel =
			typeof rawLabel === 'string' && rawLabel !== '' ? rawLabel : key;
		return { value: key, label: optionLabel };
	});

	return (
		<div className="modula-settings-editor__segmented-enum">
			<Segmented
				id={controlId}
				aria-label={label || undefined}
				options={segmentedOptions}
				value={current}
				onChange={onChange}
				disabled={disabled}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</div>
	);
}
