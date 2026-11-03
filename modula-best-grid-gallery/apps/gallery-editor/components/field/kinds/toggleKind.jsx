import { Toggle } from 'admin-ui';
import { isNil } from '../../../logic/isNil';
import { isWpTruthy } from '../../../logic/wpTruthy';
import { ControlHelp, describedByHelp } from './ControlHelp';
import { resolveToggleSwitchAriaLabel } from './toggleSwitchName';

/**
 * When stored value is missing, prefer schema.default so toggles with default:true
 * do not render as off on first open of older galleries.
 *
 * @param {*}      value
 * @param {Object} field
 * @return {*}
 */
function resolveToggleDisplayValue(value, field) {
	if (value !== '' && !isNil(value)) {
		return value;
	}
	if (
		field?.schema &&
		Object.prototype.hasOwnProperty.call(field.schema, 'default')
	) {
		return field.schema.default;
	}
	return value;
}

/**
 * @param {Object} control
 * @return {boolean}
 */
function isInvertBoolean(control) {
	return control?.invertBoolean === true;
}

/**
 * @param {Object} control
 * @return {boolean} Whether the setting stores its own on/off strings.
 */
function hasStringValues(control) {
	return control.stringOn !== undefined && control.stringOff !== undefined;
}

/**
 * @param {Object}  control
 * @param {*}       displayValue
 * @return {boolean} Whether the stored value means "on".
 */
function isStoredOn(control, displayValue) {
	if (!hasStringValues(control)) {
		return isWpTruthy(displayValue);
	}
	const raw =
		displayValue === '' || isNil(displayValue)
			? control.stringOff
			: String(displayValue);

	return raw === control.stringOn;
}

/**
 * The stored value for "on" or "off", in the setting's own type.
 *
 * @param {Object}  field
 * @param {Object}  control
 * @param {boolean} writeOn
 * @return {*} Value to store.
 */
function storedToggleValue(field, control, writeOn) {
	if (hasStringValues(control)) {
		return writeOn ? control.stringOn : control.stringOff;
	}
	const schemaType = field?.schema?.type;
	if (schemaType === 'string') {
		return writeOn ? '1' : '0';
	}
	if (schemaType === 'integer') {
		return writeOn ? 1 : 0;
	}

	return writeOn;
}

/**
 * @param {import('../fieldControlKinds').FieldControlContext} ctx
 */
export function renderToggleKind({
	field,
	control,
	controlId,
	value,
	onChange,
	disabled,
	help,
}) {
	const invert = isInvertBoolean(control);
	const storedOn = isStoredOn(
		control,
		resolveToggleDisplayValue(value, field)
	);
	// A visible `toggleLabel` (string toggles only) names the switch itself.
	const visibleLabel =
		hasStringValues(control) && typeof control.toggleLabel === 'string'
			? control.toggleLabel
			: '';

	return (
		<div className="modula-settings-editor__toggle-end">
			{visibleLabel !== '' ? (
				<label
					className="modula-settings-editor__toggle-label"
					htmlFor={controlId}
				>
					{visibleLabel}
				</label>
			) : null}
			<Toggle
				id={controlId}
				aria-label={resolveToggleSwitchAriaLabel(field, visibleLabel)}
				aria-describedby={describedByHelp(controlId, help)}
				checked={invert ? !storedOn : storedOn}
				disabled={disabled}
				onChange={(next) => {
					const writeOn = invert ? !next : next;
					onChange(storedToggleValue(field, control, writeOn));
				}}
			/>
			<ControlHelp help={help} controlId={controlId} />
		</div>
	);
}
