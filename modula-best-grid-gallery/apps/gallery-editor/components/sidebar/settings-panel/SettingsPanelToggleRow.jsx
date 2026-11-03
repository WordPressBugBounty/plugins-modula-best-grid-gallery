/**
 * Redesign settings panel — hub toggle row (label | switch).
 */
import SettingsPanelFieldRow from './SettingsPanelFieldRow';
import { writeGroupedField } from './panelFieldWrites';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 * @param {Object} [props.dependentsReset] Reset of the headless box under the toggle.
 */
export default function SettingsPanelToggleRow({
	groupKey,
	field,
	labelId,
	dependentsReset,
}) {
	return (
		<SettingsPanelFieldRow
			groupKey={groupKey}
			field={field}
			labelId={
				labelId ||
				`modula-settings-panel-toggle-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`
			}
			className="modula-settings-panel__toggle-row"
			writeValue={writeGroupedField}
			dependentsReset={dependentsReset}
		/>
	);
}
