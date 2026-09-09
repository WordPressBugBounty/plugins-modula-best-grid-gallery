import { Switch } from 'shared-ui';
import { isNil } from '../../../logic/isNil';
import { isWpTruthy } from '../../../logic/wpTruthy';

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
 * @param {Object}           ctx
 * @param {Object}           ctx.field
 * @param {Object}           ctx.control
 * @param {*}                ctx.value
 * @param {Function}         ctx.onChange
 * @param {boolean}          ctx.disabled
 * @param {string|undefined} ctx.help
 */
export function renderToggleKind({
	field,
	control,
	value,
	onChange,
	disabled,
	help,
}) {
	const displayValue = resolveToggleDisplayValue(value, field);
	const invert = isInvertBoolean(control);
	const stringOn = control.stringOn;
	const stringOff = control.stringOff;
	if (stringOn !== undefined && stringOff !== undefined) {
		const raw =
			displayValue === '' || isNil(displayValue)
				? stringOff
				: String(displayValue);
		const storedOn = raw === stringOn;
		const on = invert ? !storedOn : storedOn;
		let labelText = '';
		if (typeof control.toggleLabel === 'string') {
			labelText = control.toggleLabel;
		}
		return (
			<div className="modula-settings-editor__toggle-end">
				<Switch
					label={labelText}
					checked={on}
					disabled={disabled}
					showStatus
					help={help}
					onChange={(next) => {
						const writeOn = invert ? !next : next;
						onChange(writeOn ? stringOn : stringOff);
					}}
				/>
			</div>
		);
	}
	const storedOn = isWpTruthy(displayValue);
	const checked = invert ? !storedOn : storedOn;
	return (
		<div className="modula-settings-editor__toggle-end">
			<Switch
				checked={checked}
				disabled={disabled}
				showStatus
				help={help}
				onChange={(next) => {
					const writeOn = invert ? !next : next;
					const schemaType = field?.schema?.type;
					let nextValue = writeOn;
					if (schemaType === 'string') {
						nextValue = writeOn ? '1' : '0';
					} else if (schemaType === 'integer') {
						nextValue = writeOn ? 1 : 0;
					}
					onChange(nextValue);
				}}
			/>
		</div>
	);
}
