/**
 * Redesign settings panel — color row (label left, swatch button right).
 */
import SettingsPanelFieldRow from './SettingsPanelFieldRow';
import { setFieldValueDirectly } from './panelFieldWrites';
import { valueOrSchemaDefault } from './valueOrSchemaDefault';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 * @param {Object} [props.dependentsReset] Reset of the headless box under the field.
 */
export default function SettingsPanelColorRow({
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
				`modula-settings-panel-color-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`
			}
			className="modula-settings-panel__color-row"
			toDisplayValue={valueOrSchemaDefault}
			writeValue={setFieldValueDirectly}
			dependentsReset={dependentsReset}
		/>
	);
}
