/**
 * Redesign settings panel — the Motion tab's Entrance and Hover menus. The
 * write goes through the grouped write, whose coupling plays a hover choice
 * through the hover builder (`applyMotionHoverSideEffects`).
 */
import SettingsPanelFieldRow from './SettingsPanelFieldRow';
import { writeGroupedField } from './panelFieldWrites';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 * @param {Object} [props.dependentsReset] Reset of the headless box under the field.
 */
export default function SettingsPanelMotionChoiceRow({
	groupKey,
	field,
	labelId,
	dependentsReset,
}) {
	return (
		<SettingsPanelFieldRow
			groupKey={groupKey}
			field={field}
			labelId={labelId}
			className="modula-settings-panel__motion-choice-row"
			writeValue={writeGroupedField}
			dependentsReset={dependentsReset}
		/>
	);
}
