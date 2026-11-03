/**
 * Redesign settings panel — the gallery type row: label, the chosen type's
 * help in the ⓘ tip, and the type control (with its change confirm), laid
 * out by the shared row rule.
 */
import { fieldRowLayout } from 'editor-shell';
import HubV2FieldControl from '../HubV2FieldControl';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import FieldHelpInfoTip from '../../schema/FieldHelpInfoTip';
import { getGalleryTypeSelectHelp } from './galleryTypeSelectHelp';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 */
export default function SettingsPanelGalleryTypeRow({
	groupKey,
	field,
	labelId,
}) {
	const { form } = useGallerySettingsFormBundle();
	const label = resolveHubV2FieldLabel(field);
	const titleId =
		labelId ||
		`modula-settings-panel-gallery-type-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`;

	const fieldWithoutHelp = {
		...field,
		editorUi: {
			...(field.editorUi && typeof field.editorUi === 'object'
				? field.editorUi
				: {}),
			suppressFieldControlHelp: true,
		},
	};

	return (
		<section
			className={`modula-settings-panel__field-row is-${fieldRowLayout(field)}`}
			aria-labelledby={titleId}
		>
			<div className="modula-settings-panel__field-label-line">
				<span className="modula-settings-editor__field-label-with-tip">
					<span
						className="modula-settings-editor__field-label"
						id={titleId}
					>
						{label}
					</span>
					<form.Subscribe selector={(s) => s.values?.general?.type}>
						{(type) => (
							<FieldHelpInfoTip
								field={{
									editorTooltip:
										getGalleryTypeSelectHelp(type),
								}}
							/>
						)}
					</form.Subscribe>
				</span>
			</div>
			<div className="modula-settings-panel__field-control">
				<HubV2FieldControl
					groupKey={groupKey}
					field={fieldWithoutHelp}
					disabled={false}
					showUpsell={false}
				/>
			</div>
		</section>
	);
}
