/**
 * Redesign settings panel — 3×3 position grid (label | grid).
 */
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import SettingsPanelFieldRow from './SettingsPanelFieldRow';
import { writeGroupedField } from './panelFieldWrites';
import { valueOrSchemaDefault } from './valueOrSchemaDefault';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 * @param {Object} [props.dependentsReset] Reset of the headless box under the field.
 */
export default function SettingsPanelPositionGridRow({
	groupKey,
	field,
	labelId,
	dependentsReset,
}) {
	// The grid is named after the hub label, as the row shows it.
	const controlField = {
		...field,
		control: {
			...(field.control || {}),
			ariaLabel: resolveHubV2FieldLabel(field),
		},
	};

	return (
		<SettingsPanelFieldRow
			groupKey={groupKey}
			field={field}
			labelId={labelId}
			className="modula-settings-panel__position-grid-row"
			controlField={controlField}
			toDisplayValue={valueOrSchemaDefault}
			writeValue={writeGroupedField}
			dependentsReset={dependentsReset}
		/>
	);
}
