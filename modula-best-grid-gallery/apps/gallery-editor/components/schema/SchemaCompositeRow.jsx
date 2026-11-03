/**
 * Multiple schema fields on one visual row (e.g. width + height; gutters D/T/M).
 */

import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	AdminUiScope,
	DEVICE_ROW_LAYOUT,
	DependentRowIcon,
} from 'editor-shell';
import { getGroupKeyFromGroupedPath } from '../../data/formSchema';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { getByPath } from '../../logic/getByPath';
import { resetSettingsFieldValue } from '../../logic/settingsFieldDefault';
import DeviceSwitch, { deviceLabel } from '../field/DeviceSwitch';
import SchemaFieldRow from './SchemaFieldRow';
import SchemaFieldDirtyChrome from './SchemaFieldDirtyChrome';

/**
 * @param {unknown} current
 * @param {unknown} defaultValue
 * @return {boolean}
 */
function differsFromDefault(current, defaultValue) {
	if (current === defaultValue) {
		return false;
	}
	if (
		(current === null || current === undefined) &&
		(defaultValue === null || defaultValue === undefined)
	) {
		return false;
	}
	if (
		typeof defaultValue === 'number' ||
		typeof current === 'number' ||
		(typeof defaultValue === 'string' &&
			defaultValue !== '' &&
			Number.isFinite(Number(defaultValue)))
	) {
		const a = Number(current);
		const b = Number(defaultValue);
		if (Number.isFinite(a) && Number.isFinite(b)) {
			return a !== b;
		}
	}
	return String(current ?? '') !== String(defaultValue ?? '');
}

/**
 * @param {Object}   props
 * @param {Object[]} props.fields   Enriched schema fields sharing the same `editorUi.row`.
 * @param {boolean}  props.disabled
 */
export default function SchemaCompositeRow(props) {
	// Pro renders composite rows through the host too; see SchemaFieldRow.
	return (
		<AdminUiScope>
			<SchemaCompositeRowContent {...props} />
		</AdminUiScope>
	);
}

/**
 * @param {Object}   props
 * @param {Object[]} props.fields
 * @param {boolean}  props.disabled
 */
function SchemaCompositeRowContent({ fields, disabled }) {
	const n = fields.length;
	const withHeading = fields[0]?.editorUi?.compositeHeading === true;
	const dividerBefore = fields[0]?.editorUi?.compositeDividerBefore === true;
	const useDeviceTabs = fields[0]?.editorUi?.compositeDeviceTabs === true;
	const stackTitle =
		fields[0]?.editorUi?.compositeStackTitle ??
		(withHeading ? __('Gutter', 'modula-best-grid-gallery') : '');

	const sorted = [...fields].sort((a, b) => {
		const sa = a.editorUi?.slot ?? 0;
		const sb = b.editorUi?.slot ?? 0;
		return sa - sb;
	});

	const customDeviceKeys = fields[0]?.editorUi?.compositeDeviceKeys;
	const deviceKeys = sorted.map((_, i) => {
		if (
			Array.isArray(customDeviceKeys) &&
			typeof customDeviceKeys[i] === 'string' &&
			customDeviceKeys[i] !== ''
		) {
			return customDeviceKeys[i];
		}
		/* Desktop + mobile only (e.g. pagination) — skip unused tablet key. */
		if (sorted.length === 2) {
			return i === 0 ? 'desktop' : 'mobile';
		}
		if (i === 0) {
			return 'desktop';
		}
		if (i === 1) {
			return 'tablet';
		}
		return 'mobile';
	});

	const [activeDevice, setActiveDevice] = useState(
		deviceKeys[0] || 'desktop'
	);
	const { form } = useGallerySettingsFormBundle();

	if (useDeviceTabs && sorted.length > 0) {
		const activeIndex = Math.max(0, deviceKeys.indexOf(activeDevice));
		const activeField = sorted[activeIndex] || sorted[0];

		return (
			<div
				className={`modula-settings-editor__field-row modula-settings-editor__field-row--composite modula-settings-editor__field-row--composite-with-heading modula-settings-editor__field-row--device-tabs modula-settings-editor__field-row--layout-${DEVICE_ROW_LAYOUT}${
					dividerBefore
						? ' modula-settings-editor__field-row--composite-divider-before'
						: ''
				}`}
			>
				<div className="modula-settings-editor__composite-with-heading-inner">
					<form.Subscribe selector={(s) => s.values}>
						{(values) => {
							const stackDirtyCurrent = getByPath(
								values,
								activeField.groupedPath
							);
							const stackDirtyDef = activeField.schema?.default;
							const dirtyActive = differsFromDefault(
								stackDirtyCurrent,
								stackDirtyDef
							);

							const activeGroupKey =
								getGroupKeyFromGroupedPath(activeField);
							const activeFieldName = `${activeGroupKey}.${activeField.groupedKey}`;

							const devices = sorted.map((field, i) => ({
								value: deviceKeys[i],
								label:
									typeof field.editorLabel === 'string' &&
									field.editorLabel !== ''
										? field.editorLabel
										: deviceLabel(deviceKeys[i]),
							}));
							return (
								// One line: title, reset dot and device switch
								// (the slider's value box joins it; canvas).
								<div className="modula-settings-editor__composite-stack-heading-row">
									<DependentRowIcon />
									{stackTitle ? (
										<SchemaFieldDirtyChrome
											label={stackTitle}
											dirty={dirtyActive}
											onReset={() => {
												resetSettingsFieldValue(
													form,
													activeFieldName,
													activeField.schema,
													activeField.groupedPath
												);
											}}
										>
											<div className="modula-settings-editor__composite-stack-heading">
												{stackTitle}
											</div>
										</SchemaFieldDirtyChrome>
									) : null}
									<DeviceSwitch
										devices={devices}
										value={activeDevice}
										onChange={setActiveDevice}
										disabled={disabled}
										label={
											stackTitle ||
											__(
												'Device',
												'modula-best-grid-gallery'
											)
										}
									/>
								</div>
							);
						}}
					</form.Subscribe>
					<SchemaFieldRow
						key={activeField.groupedPath}
						groupKey={getGroupKeyFromGroupedPath(activeField)}
						field={activeField}
						disabled={disabled}
						variant="controlOnly"
					/>
				</div>
			</div>
		);
	}

	let gridClass =
		'modula-settings-editor__composite-grid modula-settings-editor__composite-grid--cells-auto';
	if (fields[0]?.editorUi?.compositeStackColumns === true) {
		gridClass =
			'modula-settings-editor__composite-grid modula-settings-editor__composite-grid--cells-stacked';
	} else if (n === 2) {
		const equal = fields[0]?.editorUi?.compositeEqualColumns === true;
		gridClass = equal
			? 'modula-settings-editor__composite-grid modula-settings-editor__composite-grid--cells-2-equal'
			: 'modula-settings-editor__composite-grid modula-settings-editor__composite-grid--cells-2';
	} else if (n === 3) {
		gridClass =
			'modula-settings-editor__composite-grid modula-settings-editor__composite-grid--cells-3';
	}

	const grid = (
		<div className={gridClass}>
			{fields.map((field) => (
				<SchemaFieldRow
					key={field.groupedPath}
					groupKey={getGroupKeyFromGroupedPath(field)}
					field={field}
					disabled={disabled}
					variant="inline"
				/>
			))}
		</div>
	);

	if (withHeading) {
		return (
			<div
				className={`modula-settings-editor__field-row modula-settings-editor__field-row--composite modula-settings-editor__field-row--composite-with-heading${
					dividerBefore
						? ' modula-settings-editor__field-row--composite-divider-before'
						: ''
				}`}
			>
				<div className="modula-settings-editor__composite-with-heading-inner">
					<div className="modula-settings-editor__composite-stack-heading">
						{stackTitle}
					</div>
					{grid}
				</div>
			</div>
		);
	}

	return (
		<div className="modula-settings-editor__field-row modula-settings-editor__field-row--composite">
			{grid}
		</div>
	);
}
