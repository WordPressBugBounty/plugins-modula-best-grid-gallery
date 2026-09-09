/**
 * Redesign settings panel — 3×3 position grid (label above, FieldStack gutters).
 */
import { FieldStack } from 'shared-ui';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { validateFieldValue } from '../../../logic/validateFieldValue';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { isNil } from '../../../logic/isNil';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import EditorUpsellBlurb from '../../upsell/EditorUpsellBlurb';
import { resolveOmitControlInLite } from '../../../logic/proGateLock';
import {
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../../logic/settingsFieldDefault';
import { getFieldControlHelp } from '../../field/fieldControlHelp';
import { applyGroupedFieldWrite } from '../../../logic/groupedFieldWrite';
import { renderPositionGridKind } from '../../field/kinds/positionGridKind';

/**
 * @param {*}      value
 * @param {Object} field
 * @return {*}
 */
function resolveGridDisplayValue(value, field) {
	if (value !== '' && !isNil(value)) {
		return value;
	}
	if (
		field?.schema &&
		Object.prototype.hasOwnProperty.call(field.schema, 'default') &&
		!isNil(field.schema.default)
	) {
		return field.schema.default;
	}
	return value;
}

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 */
export default function SettingsPanelPositionGridRow({ groupKey, field }) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const isPro = Boolean(editor.isPro);
	const label = resolveHubV2FieldLabel(field);
	const fieldName = `${groupKey}.${field.groupedKey}`;
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	const disabledByLiteSchema =
		!isPro && schemaObj && schemaObj.editorDisabledInLite === true;
	const controlDisabled = disabledByLiteSchema || omitControlInLite;
	const help = getFieldControlHelp(field);

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
				const displayValue = resolveGridDisplayValue(
					fieldApi.state.value,
					field
				);
				const dirty = !isSettingsValueAtDefault(
					fieldApi.state.value,
					field.schema
				);

				return (
					<FieldStack
						className="modula-settings-panel__position-grid-row"
						label={label}
						help={help}
						dirty={dirty}
						onReset={() => {
							resetSettingsFieldValue(
								form,
								fieldName,
								field.schema,
								field.groupedPath
							);
						}}
					>
						{renderPositionGridKind({
							control: {
								...(field.control || {}),
								ariaLabel: label,
							},
							value: displayValue,
							onChange: (next) => {
								applyGroupedFieldWrite(form, {
									fieldName,
									groupedPath: field.groupedPath,
									value: next,
								});
							},
							disabled: controlDisabled,
							help: undefined,
						})}
					</FieldStack>
				);
			}}
		</form.Field>
	);
}
