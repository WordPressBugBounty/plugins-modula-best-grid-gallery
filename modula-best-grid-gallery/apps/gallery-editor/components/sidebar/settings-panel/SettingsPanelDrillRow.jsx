/**
 * Redesign settings panel — drill row (label · value · chevron).
 */
import { __ } from '@wordpress/i18n';
import { Icon, chevronRight } from '@wordpress/icons';
import { SettingsRow } from 'shared-ui';
import { useTakeoverSidebarStack } from '../../../context/TakeoverSidebarStackContext';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { getEnrichedFieldByGroupedPath } from '../../../data/formSchema';
import { getByPath } from '../../../logic/getByPath';
import {
	isPresentationOnlyField,
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from '../../../logic/settingsFieldDefault';
import DrillValueSummary from './DrillValueSummary';

/**
 * @param {string[]} groupedPaths
 * @return {{ path: string, groupId: string, field: Object }[]}
 */
function collectResettableDrillFields(groupedPaths) {
	const out = [];
	if (!Array.isArray(groupedPaths)) {
		return out;
	}
	for (const raw of groupedPaths) {
		if (typeof raw !== 'string') {
			continue;
		}
		const path = raw.trim();
		if (!path) {
			continue;
		}
		const hit = getEnrichedFieldByGroupedPath(path);
		if (!hit?.field || isPresentationOnlyField(hit.field)) {
			continue;
		}
		out.push({
			path,
			groupId: hit.groupId,
			field: hit.field,
		});
	}
	return out;
}

/**
 * @param {Object}   props
 * @param {object}   props.section Hub drill section.
 * @param {string}   props.label
 * @param {string[]} props.groupedPaths
 * @param {string}   [props.hubHelp]
 * @param {Object}   [props.auxiliaryPanel]
 * @param {string}   [props.nestedUpsellGroupedPath]
 */
export default function SettingsPanelDrillRow({
	section,
	label,
	groupedPaths,
	hubHelp = '',
	auxiliaryPanel = null,
	nestedUpsellGroupedPath = '',
}) {
	const { pushFrame } = useTakeoverSidebarStack();
	const { form } = useGallerySettingsFormBundle();
	const canOpen = Array.isArray(groupedPaths) && groupedPaths.length > 0;
	const frameHelp =
		(typeof hubHelp === 'string' && hubHelp.trim() !== ''
			? hubHelp.trim()
			: '') ||
		(typeof section?.hubHelp === 'string' && section.hubHelp.trim() !== ''
			? section.hubHelp.trim()
			: '');

	const resettableFields = collectResettableDrillFields(groupedPaths);

	return (
		<form.Subscribe selector={(s) => s.values}>
			{(values) => {
				const dirty = resettableFields.some(
					({ path, field }) =>
						!isSettingsValueAtDefault(
							getByPath(values, path),
							field.schema
						)
				);
				return (
					<SettingsRow
						className="modula-settings-panel__drill-row"
						label={label}
						value={
							<DrillValueSummary
								section={section}
								values={values}
							/>
						}
						end={
							<Icon
								icon={chevronRight}
								size={20}
								aria-hidden="true"
							/>
						}
						disabled={!canOpen}
						dirty={dirty}
						onReset={
							resettableFields.length > 0
								? () => {
										resettableFields.forEach(
											({ path, groupId, field }) => {
												resetSettingsFieldValue(
													form,
													`${groupId}.${field.groupedKey}`,
													field.schema,
													path
												);
											}
										);
									}
								: undefined
						}
						onActivate={
							canOpen
								? () => {
										pushFrame({
											title: label,
											groupedPaths,
											...(frameHelp !== ''
												? { hubHelp: frameHelp }
												: {}),
											...(auxiliaryPanel
												? { auxiliaryPanel }
												: {}),
											...(typeof nestedUpsellGroupedPath ===
												'string' &&
											nestedUpsellGroupedPath.trim() !==
												''
												? {
														nestedUpsellGroupedPath:
															nestedUpsellGroupedPath.trim(),
													}
												: {}),
										});
									}
								: undefined
						}
						aria-label={
							canOpen
								? label
								: __(
										'No options to show for the current gallery type.',
										'modula-best-grid-gallery'
									)
						}
					/>
				);
			}}
		</form.Subscribe>
	);
}
