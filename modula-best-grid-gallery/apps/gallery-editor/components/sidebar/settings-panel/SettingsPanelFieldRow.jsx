/**
 * One settings-panel hub row: label line (label, info tip, reset dot) and
 * the field's control from the shared kind mapping (`FieldControl`), laid
 * out by the shared row rule (`fieldRowLayout`). The toggle, select,
 * segmented, colour and position rows only choose how a change is written.
 */
import {
	AdminUiScope,
	fieldControlId,
	fieldRowLayout,
	hostRowReset,
} from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { validateFieldValue } from '../../../logic/validateFieldValue';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { resolveHubV2FieldLabel } from '../../../constants/sidebarV2Meta';
import { resolveOmitControlInLite } from '../../../logic/proGateLock';
import { isCompressionFieldUnavailable } from '../../../logic/compressionAvailability';
import {
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../../logic/settingsFieldDefault';
import FieldControl from '../../field/FieldControl';
import EditorUpsellBlurb from '../../upsell/EditorUpsellBlurb';
import FieldHelpInfoTip from '../../schema/FieldHelpInfoTip';
import SchemaFieldDirtyChrome from '../../schema/SchemaFieldDirtyChrome';

/**
 * @param {*} value
 * @return {*} The value unchanged.
 */
const asStored = (value) => value;

/**
 * @typedef {import('editor-shell/logic').ResetState} ResetState
 */

/**
 * @param {Object}                            props
 * @param {string}                            props.groupKey
 * @param {Object}                            props.field
 * @param {(next: *, target: Object) => void} props.writeValue       Writes a change; receives `{ form, fieldName, field }`.
 * @param {string}                            [props.labelId]         Row id.
 * @param {string}                            [props.className]       Row modifier.
 * @param {Object}                            [props.controlField]    Field given to the control (e.g. without help).
 * @param {(value: *, field: Object) => *}    [props.toDisplayValue]  Value the control shows.
 * @param {ResetState}                        [props.dependentsReset] Reset of the headless box under this field; the row's reset covers it.
 */
export default function SettingsPanelFieldRow({
	groupKey,
	field,
	writeValue,
	labelId,
	className = '',
	controlField = field,
	toDisplayValue = asStored,
	dependentsReset,
}) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const label = resolveHubV2FieldLabel(field);
	const fieldName = `${groupKey}.${field.groupedKey}`;
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	const disabledByLiteSchema =
		!editor.isPro && schemaObj?.editorDisabledInLite === true;
	// Read-only: neither the control nor the reset dot may change the stored value.
	const compressionUnavailable = isCompressionFieldUnavailable(
		schemaObj,
		editor
	);
	const controlDisabled = disabledByLiteSchema || compressionUnavailable;

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

	const fieldValidators = {
		onChange: ({ value: v }) => {
			const r = validateFieldValue(field, v);
			return r.valid ? undefined : r.message;
		},
	};

	/**
	 * @param {*} value The field's current value.
	 * @return {ResetState} The row's reset.
	 */
	const rowResetFor = (value) =>
		hostRowReset(
			{
				isDirty:
					!compressionUnavailable &&
					!isSettingsValueAtDefault(value, field.schema),
				reset: () => {
					resetSettingsFieldValue(
						form,
						fieldName,
						field.schema,
						field.groupedPath
					);
				},
			},
			dependentsReset
		);

	return (
		<AdminUiScope>
			<form.Field name={fieldName} validators={fieldValidators}>
				{(fieldApi) => {
					const rowReset = rowResetFor(fieldApi.state.value);
					return (
						<div
							id={labelId}
							className={[
								'modula-settings-panel__field-row',
								`is-${fieldRowLayout(field)}`,
								className,
							]
								.filter(Boolean)
								.join(' ')}
						>
							<div className="modula-settings-panel__field-label-line">
								<SchemaFieldDirtyChrome
									label={label}
									withDependents={Boolean(dependentsReset)}
									dirty={rowReset.isDirty}
									onReset={rowReset.reset}
								>
									<span className="modula-settings-editor__field-label-with-tip">
										<label
											className="modula-settings-editor__field-label"
											htmlFor={fieldControlId(
												field.groupedPath
											)}
										>
											{label}
										</label>
										<FieldHelpInfoTip
											field={field}
											path={field.groupedPath}
										/>
									</span>
								</SchemaFieldDirtyChrome>
							</div>
							<div className="modula-settings-panel__field-control">
								<FieldControl
									field={controlField}
									value={toDisplayValue(
										fieldApi.state.value,
										field
									)}
									onChange={(next) =>
										writeValue(next, {
											form,
											fieldName,
											field,
										})
									}
									disabled={controlDisabled}
								/>
							</div>
						</div>
					);
				}}
			</form.Field>
		</AdminUiScope>
	);
}
