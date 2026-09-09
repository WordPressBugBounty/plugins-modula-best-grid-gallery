/**
 * Redesign settings panel — segmented enum row (label above, Segmented full width).
 */
import { FieldStack, Segmented } from 'shared-ui';
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

/**
 * @param {*}      value
 * @param {Object} field
 * @return {string}
 */
function resolveSegmentedDisplayValue(value, field) {
	if (value !== '' && !isNil(value)) {
		return String(value);
	}
	const options = field?.control?.options;
	if (Array.isArray(options) && options.length > 0) {
		return String(options[0]);
	}
	if (
		field?.schema &&
		Object.prototype.hasOwnProperty.call(field.schema, 'default') &&
		field.schema.default !== '' &&
		!isNil(field.schema.default)
	) {
		return String(field.schema.default);
	}
	return '';
}

/**
 * @param {Object} field
 * @return {{ value: string, label: string }[]}
 */
function buildSegmentedOptions(field) {
	const control = field?.control || {};
	const labels = control.optionLabels || {};
	const options = Array.isArray(control.options) ? control.options : [];
	return options.map((option) => {
		const key = String(option);
		const rawLabel = Array.isArray(labels)
			? labels[options.indexOf(option)]
			: (labels[key] ?? labels[option] ?? key);
		const label =
			typeof rawLabel === 'string' && rawLabel !== '' ? rawLabel : key;
		return { value: key, label };
	});
}

/**
 * @param {Object} props
 * @param {string} props.groupKey
 * @param {Object} props.field
 * @param {string} [props.labelId]
 */
export default function SettingsPanelSegmentedRow({
	groupKey,
	field,
	labelId,
}) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const isPro = Boolean(editor.isPro);
	const label = resolveHubV2FieldLabel(field);
	const titleId =
		labelId ||
		`modula-settings-panel-segmented-${String(field?.groupedPath || 'field').replace(/[^a-z0-9.-]/gi, '-')}`;
	const fieldName = `${groupKey}.${field.groupedKey}`;
	const schemaObj =
		field.schema && typeof field.schema === 'object' ? field.schema : null;
	const omitControlInLite = resolveOmitControlInLite(schemaObj, editor);
	const disabledByLiteSchema =
		!isPro && schemaObj && schemaObj.editorDisabledInLite === true;
	const controlDisabled = disabledByLiteSchema || omitControlInLite;
	const segmentedOptions = buildSegmentedOptions(field);

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
				const displayValue = resolveSegmentedDisplayValue(
					fieldApi.state.value,
					field
				);

				const dirty = !isSettingsValueAtDefault(
					fieldApi.state.value,
					field.schema
				);

				return (
					<FieldStack
						className="modula-settings-panel__segmented-row modula-settings-panel__segmented-row--stacked"
						label={label}
						id={titleId}
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
						<Segmented
							options={segmentedOptions}
							value={displayValue}
							disabled={controlDisabled}
							aria-label={label}
							onChange={(next) => {
								form.setFieldValue(fieldName, next);
							}}
						/>
					</FieldStack>
				);
			}}
		</form.Field>
	);
}
