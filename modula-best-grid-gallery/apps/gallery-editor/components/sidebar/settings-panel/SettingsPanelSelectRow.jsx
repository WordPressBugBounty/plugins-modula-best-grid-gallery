/**
 * Redesign settings panel — select row; the control comes from selectKind.
 */
import { getGalleryPreviewReduxStore } from '../../../utils/previewReduxStoreRef';
import { seedTemplateContentBlocksForLayout } from '../../../logic/applyTemplateLayoutSideEffects';
import SettingsPanelFieldRow from './SettingsPanelFieldRow';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 * @param {Object} [props.dependentsReset] Reset of the headless box under the field.
 */
export default function SettingsPanelSelectRow({
	groupKey,
	field,
	labelId,
	dependentsReset,
}) {
	const fieldWithoutHelp = {
		...field,
		editorUi: {
			...(field.editorUi && typeof field.editorUi === 'object'
				? field.editorUi
				: {}),
			suppressFieldControlHelp: true,
		},
	};

	const writeSelect = (next, { form, fieldName }) => {
		form.setFieldValue(fieldName, next);
		if (field?.groupedPath !== 'template.templateLayout') {
			return;
		}
		const store = getGalleryPreviewReduxStore();
		const slug = String(next || '').trim();
		if (!store || !slug) {
			return;
		}
		seedTemplateContentBlocksForLayout(store, slug);
	};

	return (
		<SettingsPanelFieldRow
			groupKey={groupKey}
			field={field}
			labelId={
				labelId ||
				`modula-settings-panel-select-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`
			}
			className="modula-settings-panel__select-row"
			controlField={fieldWithoutHelp}
			writeValue={writeSelect}
			dependentsReset={dependentsReset}
		/>
	);
}
