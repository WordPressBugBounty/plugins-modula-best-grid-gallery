/**
 * Redesign settings panel — featured embedded field (e.g. gallery type select).
 */
import HubV2FieldControl from '../HubV2FieldControl';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import { getGalleryTypeSelectHelp } from './galleryTypeSelectHelp';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 */
export default function SettingsPanelEmbeddedField({
	groupKey,
	field,
	labelId,
}) {
	const { form } = useGallerySettingsFormBundle();
	const label = resolveHubV2FieldLabel(field);
	const titleId =
		labelId ||
		`modula-settings-panel-embedded-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`;

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
			className="modula-settings-panel__embedded"
			aria-labelledby={titleId}
		>
			<span
				className="modula-settings-panel__embedded-label"
				id={titleId}
			>
				{label}
			</span>
			<div className="modula-settings-panel__embedded-control">
				<HubV2FieldControl
					groupKey={groupKey}
					field={fieldWithoutHelp}
					disabled={false}
					showUpsell={false}
				/>
			</div>
			{field.groupedPath === 'general.type' ? (
				<form.Subscribe selector={(s) => s.values?.general?.type}>
					{(type) => {
						const help = getGalleryTypeSelectHelp(type);
						if (!help) {
							return null;
						}
						return (
							<p className="modula-settings-panel__embedded-help">
								{help}
							</p>
						);
					}}
				</form.Subscribe>
			) : null}
		</section>
	);
}
