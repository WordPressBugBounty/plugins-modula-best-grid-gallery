import { AdminUiScope, fieldControlId } from 'editor-shell';
import { resolveFieldRowLabel } from '../../logic/fieldRowLabel';
import { getFieldControlHelp } from './fieldControlHelp';
import { renderFieldControlKind } from './fieldControlKinds';

/**
 * Renders a schema field's control from `control.kind` (see
 * `fieldControlKinds.js`) on admin-ui.
 *
 * @param {Object}   props
 * @param {Object}   props.field    Form schema field
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 */
export default function FieldControl({ field, value, onChange, disabled }) {
	const control = field.control || {};

	return (
		<AdminUiScope>
			{renderFieldControlKind({
				field,
				control,
				kind: control.kind || 'text',
				controlId: fieldControlId(field.groupedPath),
				label: resolveFieldRowLabel(field),
				value,
				onChange,
				disabled,
				help: getFieldControlHelp(field),
			})}
		</AdminUiScope>
	);
}
