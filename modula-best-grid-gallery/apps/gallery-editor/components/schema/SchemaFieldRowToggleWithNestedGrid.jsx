/**
 * Toggle row with nested sidebar: whole row opens the panel (except the switch); chevron matches hub drill rows.
 */
import { __ } from '@wordpress/i18n';
import { Icon, chevronRight } from '@wordpress/icons';
import FieldControl from '../field/FieldControl';
import FieldHelpInfoTip from './FieldHelpInfoTip';
import SchemaFieldDirtyChrome from './SchemaFieldDirtyChrome';
import { useTakeoverSidebarStack } from '../../context/TakeoverSidebarStackContext';
import { isNil } from '../../logic/isNil';
import { isWpTruthy } from '../../logic/wpTruthy';
import {
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../logic/settingsFieldDefault';

/**
 * @param {*}      value   Current field value.
 * @param {Object} control Field control (may include stringOn/stringOff).
 * @param {Object} [field] Field descriptor (schema.default when value is unset).
 * @return {boolean} True when the toggle reads as on.
 */
function isToggleControlChecked(value, control, field) {
	let effective = value;
	if (
		(value === '' || isNil(value)) &&
		field?.schema &&
		Object.prototype.hasOwnProperty.call(field.schema, 'default')
	) {
		effective = field.schema.default;
	}
	const stringOn = control?.stringOn;
	const stringOff = control?.stringOff;
	if (stringOn !== undefined && stringOff !== undefined) {
		const raw =
			effective === '' || isNil(effective)
				? stringOff
				: String(effective);
		return raw === stringOn;
	}
	return isWpTruthy(effective);
}

/**
 * @param {Object}                                    props
 * @param {string}                                    props.label
 * @param {Object}                                    props.field
 * @param {import('@tanstack/react-form').FormApi}    props.form
 * @param {string}                                    props.fieldName
 * @param {Object}                                    props.fieldValidators
 * @param {boolean}                                   props.controlDisabled
 * @param {Function}                                  props.makeOnChange           (fieldApi) => onChange
 * @param {Object|null}                               props.schemaObj
 * @param {boolean}                                   props.isPro
 * @param {{ blocked: boolean }}                      props.extensionUpsellBarrier
 * @param {{ title: string, groupedPaths: string[] }} props.sidebarNestedPanel
 * @return {import('react').ReactElement} Grid cells for label, toggle, chevron, and optional foot.
 */
export default function SchemaFieldRowToggleWithNestedGrid({
	label,
	field,
	form,
	fieldName,
	fieldValidators,
	controlDisabled,
	makeOnChange,
	schemaObj,
	isPro,
	extensionUpsellBarrier,
	sidebarNestedPanel,
}) {
	const { pushFrame } = useTakeoverSidebarStack();
	const fieldForToggle = {
		...field,
		control: { ...field.control, kind: 'toggle' },
	};

	const onDrillIn = () => {
		pushFrame({
			title: sidebarNestedPanel.title,
			groupedPaths: sidebarNestedPanel.groupedPaths,
			...(schemaObj?.editorLightboxLiteUpsell
				? { nestedUpsellGroupedPath: field.groupedPath }
				: {}),
		});
	};

	return (
		<form.Field name={fieldName} validators={fieldValidators}>
			{(fieldApi) => {
				const err =
					fieldApi.state.meta.isTouched &&
					fieldApi.state.meta.errors?.length > 0
						? fieldApi.state.meta.errors[0]
						: null;
				const showFoot = Boolean(err);
				const toggleOn = isToggleControlChecked(
					fieldApi.state.value,
					field.control,
					field
				);
				const gateNeedsNestedUpsell =
					Boolean(schemaObj?.editorLightboxLiteUpsell) &&
					(!isPro || extensionUpsellBarrier.blocked);
				const drillEnabled = toggleOn || gateNeedsNestedUpsell;
				const openLabel = sidebarNestedPanel.title;
				return (
					<>
						<button
							type="button"
							className="modula-settings-editor__field-toggle-nested-hit-layer"
							disabled={!drillEnabled}
							tabIndex={-1}
							aria-hidden={drillEnabled ? undefined : true}
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!drillEnabled) {
									return;
								}
								onDrillIn();
							}}
						/>
						<div className="modula-settings-editor__field-label-col modula-settings-editor__field-label-col--toggle-nested-z">
							<div className="modula-settings-editor__field-label-line modula-settings-editor__field-label-line--toggle-nested-pass-through">
								<SchemaFieldDirtyChrome
									dirty={
										!isSettingsValueAtDefault(
											fieldApi.state.value,
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
								>
									<span className="modula-settings-editor__field-label-with-tip">
										<span className="modula-settings-editor__field-label">
											{label}
										</span>
										<FieldHelpInfoTip
											field={field}
											path={field.groupedPath}
										/>
									</span>
								</SchemaFieldDirtyChrome>
							</div>
						</div>
						<div className="modula-settings-editor__field-toggle-grid-bridge modula-settings-editor__field-toggle-grid-bridge--with-drill">
							<div className="modula-settings-editor__field-toggle-drill-row">
								<div className="modula-settings-editor__field-control-col modula-settings-editor__field-control-col--toggle-inline modula-settings-editor__field-control-col--toggle-nested-z">
									<div
										id={`modula-field-${field.groupedPath}`}
									>
										<FieldControl
											field={fieldForToggle}
											value={fieldApi.state.value}
											onChange={makeOnChange(fieldApi)}
											disabled={controlDisabled}
										/>
									</div>
								</div>
								<div
									className="modula-settings-editor__field-toggle-nested-chevron"
									aria-hidden="true"
								>
									<Icon
										icon={chevronRight}
										size={22}
										className="modula-settings-editor__category-hub-drill-chevron"
									/>
								</div>
							</div>
						</div>
						{showFoot ? (
							<div className="modula-settings-editor__field-toggle-foot">
								{err ? (
									<p
										className="modula-settings-editor__field-error"
										role="alert"
									>
										{err}
									</p>
								) : null}
							</div>
						) : null}
						{drillEnabled ? (
							<span className="screen-reader-text">
								{__(
									'Press or activate the row to open settings, or use the switch to turn the option on or off.',
									'modula-best-grid-gallery'
								)}{' '}
								{openLabel}
							</span>
						) : null}
					</>
				);
			}}
		</form.Field>
	);
}
