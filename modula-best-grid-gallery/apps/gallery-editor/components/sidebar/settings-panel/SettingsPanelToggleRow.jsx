/**
 * Redesign settings panel — hub toggle row (shared-ui Switch + optional tooltip).
 */
import { SettingsRow, Switch } from 'shared-ui';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { validateFieldValue } from '../../../logic/validateFieldValue';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { isNil } from '../../../logic/isNil';
import { isWpTruthy } from '../../../logic/wpTruthy';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import EditorUpsellBlurb from '../../upsell/EditorUpsellBlurb';
import { resolveOmitControlInLite } from '../../../logic/proGateLock';
import FieldHelpInfoTip from '../../schema/FieldHelpInfoTip';
import { applyGroupedFieldWrite } from '../../../logic/groupedFieldWrite';
import {
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../../logic/settingsFieldDefault';

/**
 * @param {*}      value
 * @param {Object} field
 * @return {*}
 */
function resolveToggleDisplayValue(value, field) {
	if (value !== '' && !isNil(value)) {
		return value;
	}
	if (
		field?.schema &&
		Object.prototype.hasOwnProperty.call(field.schema, 'default')
	) {
		return field.schema.default;
	}
	return value;
}

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 */
export default function SettingsPanelToggleRow({ groupKey, field, labelId }) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const isPro = Boolean(editor.isPro);
	const label = resolveHubV2FieldLabel(field);
	const titleId =
		labelId ||
		`modula-settings-panel-toggle-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`;
	const fieldName = `${groupKey}.${field.groupedKey}`;
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	const disabledByLiteSchema =
		!isPro && schemaObj && schemaObj.editorDisabledInLite === true;
	const controlDisabled = disabledByLiteSchema || omitControlInLite;

	const control = field.control || {};
	const invert = control.invertBoolean === true;
	const stringOn = control.stringOn;
	const stringOff = control.stringOff;

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

	const labelNode = (
		<span className="modula-settings-editor__field-label-with-tip">
			<span className="modula-settings-editor__field-label">{label}</span>
			<FieldHelpInfoTip field={field} path={field.groupedPath} />
		</span>
	);

	return (
		<form.Field name={fieldName} validators={fieldValidators}>
			{(fieldApi) => {
				const displayValue = resolveToggleDisplayValue(
					fieldApi.state.value,
					field
				);
				let storedOn = isWpTruthy(displayValue);
				if (stringOn !== undefined && stringOff !== undefined) {
					const raw =
						displayValue === '' || isNil(displayValue)
							? stringOff
							: String(displayValue);
					storedOn = raw === stringOn;
				}
				const checked = invert ? !storedOn : storedOn;

				return (
					<SettingsRow
						className="modula-settings-panel__toggle-row"
						label={labelNode}
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
							<Switch
								className="modula-settings-panel__switch"
								checked={checked}
								disabled={controlDisabled}
								showStatus
								aria-label={label}
								onChange={(next) => {
									const writeOn = invert ? !next : next;
									if (
										stringOn !== undefined &&
										stringOff !== undefined
									) {
										applyGroupedFieldWrite(form, {
											fieldName,
											groupedPath: field.groupedPath,
											value: writeOn
												? stringOn
												: stringOff,
										});
										return;
									}
									const schemaType = field?.schema?.type;
									let nextValue = writeOn;
									if (schemaType === 'string') {
										nextValue = writeOn ? '1' : '0';
									} else if (schemaType === 'integer') {
										nextValue = writeOn ? 1 : 0;
									}
									applyGroupedFieldWrite(form, {
										fieldName,
										groupedPath: field.groupedPath,
										value: nextValue,
									});
								}}
							/>
						}
					/>
				);
			}}
		</form.Field>
	);
}
