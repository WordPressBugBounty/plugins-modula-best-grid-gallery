import { Segmented } from 'shared-ui';
import { isNil } from '../../../logic/isNil';

/**
 * Two-or-more-option segmented control for enum fields.
 *
 * @param {Object}           ctx
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderSegmentedEnumKind({
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const labels = control.optionLabels || {};
	const descriptions = control.optionDescriptions || {};
	const options = Array.isArray(control.options) ? control.options : [];
	const current =
		isNil(value) || value === '' ? String(options[0] ?? '') : String(value);
	const activeDescription =
		typeof descriptions[current] === 'string' ? descriptions[current] : '';

	const segmentedOptions = options.map((option) => {
		const key = String(option);
		const rawLabel = Array.isArray(labels)
			? labels[options.indexOf(option)]
			: (labels[key] ?? labels[option] ?? key);
		const label =
			typeof rawLabel === 'string' && rawLabel !== '' ? rawLabel : key;
		return { value: key, label };
	});

	return (
		<div className="modula-settings-editor__segmented-enum">
			<Segmented
				options={segmentedOptions}
				value={current}
				onChange={onChange}
				disabled={disabled}
			/>
			{activeDescription ? (
				<p className="modula-settings-editor__segmented-enum-hint">
					{activeDescription}
				</p>
			) : help ? (
				<p className="modula-settings-editor__field-help">{help}</p>
			) : null}
		</div>
	);
}
