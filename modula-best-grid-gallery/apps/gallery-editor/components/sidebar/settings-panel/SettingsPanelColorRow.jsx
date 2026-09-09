/**
 * Redesign settings panel — color row (label left, swatch chip right).
 */
import { SettingsRow } from 'shared-ui';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { validateFieldValue } from '../../../logic/validateFieldValue';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { isNil } from '../../../logic/isNil';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import CompactColorControl from '../../field/CompactColorControl';
import EditorUpsellBlurb from '../../upsell/EditorUpsellBlurb';
import { resolveOmitControlInLite } from '../../../logic/proGateLock';
import {
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../../logic/settingsFieldDefault';

/**
 * @param {*}      value
 * @param {Object} field
 * @return {string}
 */
function resolveColorDisplayValue(value, field) {
	if (value !== '' && !isNil(value) && typeof value === 'string') {
		return value;
	}
	if (
		field?.schema &&
		Object.prototype.hasOwnProperty.call(field.schema, 'default') &&
		typeof field.schema.default === 'string'
	) {
		return field.schema.default;
	}
	return typeof value === 'string' ? value : '';
}

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 */
export default function SettingsPanelColorRow({ groupKey, field, labelId }) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const isPro = Boolean(editor.isPro);
	const label = resolveHubV2FieldLabel(field);
	const titleId =
		labelId ||
		`modula-settings-panel-color-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`;
	const fieldName = `${groupKey}.${field.groupedKey}`;
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	const enableAlpha = Boolean(field?.control?.acceptAlpha);
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	const disabledByLiteSchema =
		!isPro && schemaObj && schemaObj.editorDisabledInLite === true;
	const controlDisabled = disabledByLiteSchema || omitControlInLite;

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
				const displayValue = resolveColorDisplayValue(
					fieldApi.state.value,
					field
				);

				return (
					<SettingsRow
						className="modula-settings-panel__color-row"
						label={label}
						id={titleId}
						dirty={
							!isSettingsValueAtDefault(
								displayValue,
								field.schema
							)
						}
						onReset={() => {
							resetSettingsFieldValue(
								form,
								fieldName,
								field.schema,
								field.groupedPath
							);
						}}
						end={
							<CompactColorControl
								value={displayValue}
								disabled={controlDisabled}
								enableAlpha={enableAlpha}
								variant="swatch"
								onChange={(next) => {
									form.setFieldValue(fieldName, next);
								}}
							/>
						}
					/>
				);
			}}
		</form.Field>
	);
}
