import { __ } from '@wordpress/i18n';
import { TextInput } from 'admin-ui';
import { isNil } from '../../../logic/isNil';

/**
 * @param {string} key
 * @return {string} Visible name of one dimension.
 */
function dimensionLabel(key) {
	if (key === 'width') {
		return __('Width', 'modula-best-grid-gallery');
	}
	if (key === 'height') {
		return __('Height', 'modula-best-grid-gallery');
	}
	return key;
}

/**
 * Typed text to the stored number: clamped when the schema bounds both
 * ends (an empty field stays ''), else a plain integer (0 when empty or
 * not a number).
 *
 * @param {string}      text
 * @param {number|null} min
 * @param {number|null} max
 * @return {number|string} Stored value.
 */
function parseDimension(text, min, max) {
	if (min !== null && max !== null) {
		if (text === '') {
			return '';
		}
		const parsed = parseInt(text, 10);
		return Number.isFinite(parsed)
			? Math.min(max, Math.max(min, parsed))
			: min;
	}
	const parsed = text === '' ? '' : parseInt(text, 10);

	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Width × height as a pair of number fields (admin-ui has no dimensions
 * control; TextInput pairs cover it).
 *
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderDimensionsKind({
	control,
	controlId,
	value,
	onChange,
	disabled,
}) {
	const min = Number.isFinite(control.fieldMin) ? control.fieldMin : null;
	const max = Number.isFinite(control.fieldMax) ? control.fieldMax : null;
	const keys = Array.isArray(control.fields)
		? control.fields
		: ['width', 'height'];
	const obj =
		value && typeof value === 'object' && !Array.isArray(value)
			? value
			: {};

	return (
		<div className="modula-settings-editor__dimensions">
			{keys.map((key, index) => {
				// The first input takes the row label's id.
				const inputId = index === 0 ? controlId : `${controlId}-${key}`;
				return (
					<div
						key={key}
						className="modula-settings-editor__dimensions-item"
					>
						<label
							className="modula-settings-editor__dimensions-label"
							htmlFor={inputId}
						>
							{dimensionLabel(key)}
						</label>
						<TextInput
							id={inputId}
							type="number"
							min={min !== null ? min : undefined}
							max={max !== null ? max : undefined}
							value={
								isNil(obj[key]) || obj[key] === ''
									? ''
									: String(obj[key])
							}
							disabled={disabled}
							onChange={(text) => {
								onChange({
									...obj,
									[key]: parseDimension(text, min, max),
								});
							}}
						/>
					</div>
				);
			})}
		</div>
	);
}
