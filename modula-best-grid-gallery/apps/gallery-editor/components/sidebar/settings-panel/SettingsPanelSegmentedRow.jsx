/**
 * Redesign settings panel — segmented enum row (layout from `fieldRowLayout`).
 */
import SettingsPanelFieldRow from './SettingsPanelFieldRow';
import { setFieldValueDirectly } from './panelFieldWrites';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 * @param {Object} [props.dependentsReset] Reset of the headless box under the field.
 */
export default function SettingsPanelSegmentedRow({
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
				`modula-settings-panel-segmented-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`
			}
			className="modula-settings-panel__segmented-row"
			writeValue={setFieldValueDirectly}
			dependentsReset={dependentsReset}
		/>
	);
}
