/**
 * Redesign settings panel — select row chrome; control rendering lives in selectKind.
 */
import { FieldStack, SettingsRow } from 'shared-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { validateFieldValue } from '../../../logic/validateFieldValue';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import EditorUpsellBlurb from '../../upsell/EditorUpsellBlurb';
import { resolveOmitControlInLite } from '../../../logic/proGateLock';
import {
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../../logic/settingsFieldDefault';
import FieldControl from '../../field/FieldControl';
import { shouldUseMenuSelect } from '../../field/kinds/selectKind';
import { useTakeoverSaveStatus } from '../../../context/TakeoverSaveStatusContext';
import { getGalleryPreviewReduxStore } from '../../../utils/previewReduxStoreRef';
import { seedTemplateContentBlocksForLayout } from '../../../logic/applyTemplateLayoutSideEffects';

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 */
export default function SettingsPanelSelectRow({ groupKey, field, labelId }) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const queryClient = useQueryClient();
	const { runPersistTask } = useTakeoverSaveStatus();
	const isPro = Boolean(editor.isPro);
	const label = resolveHubV2FieldLabel(field);
	const titleId =
		labelId ||
		`modula-settings-panel-select-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`;
	const fieldName = `${groupKey}.${field.groupedKey}`;
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	const disabledByLiteSchema =
		!isPro && schemaObj && schemaObj.editorDisabledInLite === true;
	const controlDisabled = disabledByLiteSchema || omitControlInLite;
	const stacked = shouldUseMenuSelect(field);

	const fieldWithoutHelp = {
		...field,
		editorUi: {
			...(field.editorUi && typeof field.editorUi === 'object'
				? field.editorUi
				: {}),
			suppressFieldControlHelp: true,
		},
	};

	const fieldValidators = {
		onChange: ({ value: v }) => {
			const r = validateFieldValue(field, v);
			return r.valid ? undefined : r.message;
		},
	};

	if (omitControlInLite) {
		return (
			<div className="modula-settings-panel__toggle-upsell">
				<span className="modula-settings-panel__toggle-upsell-label">
					{label}
				</span>
				<EditorUpsellBlurb field={field} />
			</div>
		);
	}

	return (
		<form.Field name={fieldName} validators={fieldValidators}>
			{(fieldApi) => {
				const dirty = !isSettingsValueAtDefault(
					fieldApi.state.value,
					field.schema
				);
				const onReset = () => {
					resetSettingsFieldValue(
						form,
						fieldName,
						field.schema,
						field.groupedPath
					);
				};
				const control = (
					<FieldControl
						field={fieldWithoutHelp}
						value={fieldApi.state.value}
						onChange={(next) => {
							form.setFieldValue(fieldName, next);
							if (
								field?.groupedPath === 'template.templateLayout'
							) {
								const store = getGalleryPreviewReduxStore();
								const galleryId = Number(editor.galleryId) || 0;
								const slug = String(next || '').trim();
								if (store && galleryId && slug) {
									void seedTemplateContentBlocksForLayout(
										store,
										galleryId,
										slug,
										runPersistTask,
										queryClient
									).catch((err) => {
										// eslint-disable-next-line no-console
										console.error(
											'[modula] template content block seed failed',
											err
										);
									});
								}
							}
						}}
						disabled={controlDisabled}
					/>
				);

				if (stacked) {
					return (
						<FieldStack
							className="modula-settings-panel__select-row modula-settings-panel__select-row--stacked"
							label={label}
							htmlFor={titleId}
							dirty={dirty}
							onReset={onReset}
						>
							{control}
						</FieldStack>
					);
				}

				return (
					<SettingsRow
						className="modula-settings-panel__select-row"
						label={label}
						id={titleId}
						dirty={dirty}
						onReset={onReset}
						end={control}
					/>
				);
			}}
		</form.Field>
	);
}
