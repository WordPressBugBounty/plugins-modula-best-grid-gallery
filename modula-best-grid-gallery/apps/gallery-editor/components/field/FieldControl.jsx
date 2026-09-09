import { getFieldControlHelp } from './fieldControlHelp';
import { renderFieldControlKind } from './fieldControlKinds';

/**
 * Map form schema control.kind → @wordpress/components inputs.
 *
 * @param {Object}   props
 * @param {Object}   props.field    Form schema field
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 */
export default function FieldControl({ field, value, onChange, disabled }) {
	const control = field.control || {};
	const kind = control.kind || 'text';
	const help = getFieldControlHelp(field);

	return renderFieldControlKind({
		field,
		control,
		kind,
		value,
		onChange,
		disabled,
		help,
	});
}
