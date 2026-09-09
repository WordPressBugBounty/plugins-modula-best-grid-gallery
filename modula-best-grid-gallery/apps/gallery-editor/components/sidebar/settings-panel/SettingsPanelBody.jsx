/**
 * Redesign settings panel — walks hubSections; submenu + field + drill + exit + note.
 */
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { GROUP_LABELS } from '../../../constants/editorStructure';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import { useTakeoverSidebarStack } from '../../../context/TakeoverSidebarStackContext';
import { isFieldVisible } from '../../../logic/fieldVisibility';
import { getEnrichedFieldByGroupedPath } from '../../../data/formSchema';
import { getGroupedPathsForHubDrillSection } from '../../../utils/getGroupedPathsForHubDrillSection';
import { shouldRenderHubSection } from '../../../logic/hubSectionVisibility';
import SettingsPanelSection from './SettingsPanelSection';
import SettingsPanelDrillRow from './SettingsPanelDrillRow';
import SettingsPanelExitRow from './SettingsPanelExitRow';
import SettingsPanelEmbeddedField from './SettingsPanelEmbeddedField';
import SettingsPanelToggleRow from './SettingsPanelToggleRow';
import SettingsPanelColorRow from './SettingsPanelColorRow';
import SettingsPanelSegmentedRow from './SettingsPanelSegmentedRow';
import SettingsPanelSelectRow from './SettingsPanelSelectRow';
import SettingsPanelPositionGridRow from './SettingsPanelPositionGridRow';
import SettingsPanelNestedFields from './SettingsPanelNestedFields';
import SchemaFieldRow from '../../schema/SchemaFieldRow';

/**
 * @param {Object} section
 * @param {Record<string, Record<string, unknown>>} values
 * @return {boolean}
 */
function isHubSectionVisible(section, values) {
	return shouldRenderHubSection(section, values);
}

/**
 * @param {object} item
 * @param {Record<string, Record<string, unknown>>} values
 * @param {string} reactKey
 * @return {import('react').ReactNode}
 */
function renderHubFieldItem(item, values, reactKey) {
	if (
		typeof item.groupedPath !== 'string' ||
		item.groupedPath.trim() === ''
	) {
		return null;
	}
	const hit = getEnrichedFieldByGroupedPath(item.groupedPath.trim());
	if (!hit || !isFieldVisible(hit.field, values)) {
		return null;
	}

	const safeId = item.groupedPath.replace(/[^a-z0-9.-]/gi, '-');
	const labelId = `modula-settings-panel-field-${safeId}`;
	const isEmbedded =
		item.fieldPresentation === 'embedded' ||
		item.hubFieldPresentation === 'embedded';
	const kind = hit.field.control?.kind;

	if (kind === 'galleryDefaultsShell') {
		return (
			<SchemaFieldRow
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				disabled={false}
				variant="stacked"
			/>
		);
	}

	if (isEmbedded) {
		return (
			<SettingsPanelEmbeddedField
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				labelId={labelId}
			/>
		);
	}

	if (kind === 'toggle' || kind === 'toggleWithNested') {
		return (
			<SettingsPanelToggleRow
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				labelId={labelId}
			/>
		);
	}

	if (kind === 'color' || kind === 'parallaxOverlayColor') {
		return (
			<SettingsPanelColorRow
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				labelId={labelId}
			/>
		);
	}

	if (kind === 'segmentedEnum') {
		return (
			<SettingsPanelSegmentedRow
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				labelId={labelId}
			/>
		);
	}

	if (kind === 'select' || kind === 'templateLayoutSelect') {
		return (
			<SettingsPanelSelectRow
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				labelId={labelId}
			/>
		);
	}

	if (kind === 'positionGrid') {
		return (
			<SettingsPanelPositionGridRow
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				labelId={labelId}
			/>
		);
	}

	// Presentation rows (info callouts, etc.) — reuse schema row chrome.
	if (kind === 'infoCallout') {
		return (
			<SchemaFieldRow
				key={reactKey}
				groupKey={hit.groupId}
				field={hit.field}
				disabled={false}
				variant="stacked"
			/>
		);
	}

	return null;
}

/**
 * @param {Object}   props
 * @param {object}   props.category
 * @param {(name: string) => void} props.onExitCategory
 */
export default function SettingsPanelBody({ category, onExitCategory }) {
	const config = useModulaSettingsEditorConfig();
	const { form } = useGallerySettingsFormBundle();
	const { stack, stackDepth, clearStack } = useTakeoverSidebarStack();
	const formUi = config.formUi || {};
	const groupLabels = formUi.groupLabels || {};

	const groupLabel = (key) => groupLabels[key] || GROUP_LABELS[key] || key;

	useEffect(() => {
		clearStack();
	}, [category?.name, clearStack]);

	if (stackDepth > 0) {
		const frame = stack[stack.length - 1];
		return (
			<div className="modula-settings-panel__body modula-settings-panel__body--nested">
				<SettingsPanelNestedFields frame={frame} />
			</div>
		);
	}

	const sections = Array.isArray(category?.hubSections)
		? category.hubSections
		: [];

	return (
		<div className="modula-settings-panel__body">
			<form.Subscribe selector={(s) => s.values}>
				{(values) =>
					sections.map((section, i) => {
						if (!section || typeof section !== 'object') {
							return null;
						}
						if (!isHubSectionVisible(section, values)) {
							return null;
						}

						if (section.type === 'note') {
							const noteLabel =
								typeof section.label === 'string'
									? section.label.trim()
									: '';
							const noteText =
								typeof section.text === 'string'
									? section.text.trim()
									: '';
							if (noteLabel === '' && noteText === '') {
								return null;
							}
							return (
								<SettingsPanelSection
									key={`note-${i}-${noteLabel || i}`}
									label={noteLabel}
								>
									{noteText !== '' ? (
										<p className="modula-settings-panel__note-text">
											{noteText}
										</p>
									) : null}
								</SettingsPanelSection>
							);
						}

						if (
							section.type !== 'submenu' ||
							!Array.isArray(section.items)
						) {
							return null;
						}

						const submenuLabel =
							typeof section.label === 'string'
								? section.label.trim()
								: '';
						const children = section.items
							.map((item, j) => {
								if (
									!item ||
									typeof item !== 'object' ||
									!isHubSectionVisible(item, values)
								) {
									return null;
								}

								if (item.type === 'note') {
									const noteText =
										typeof item.text === 'string'
											? item.text.trim()
											: '';
									if (noteText === '') {
										return null;
									}
									return (
										<p
											key={`note-${i}-${j}`}
											className="modula-settings-panel__note-text"
										>
											{noteText}
										</p>
									);
								}

								if (item.type === 'field') {
									return renderHubFieldItem(
										item,
										values,
										`field-${i}-${j}`
									);
								}

								if (item.type === 'drill') {
									if (
										!shouldRenderHubSection(item, values)
									) {
										return null;
									}
									const paths =
										getGroupedPathsForHubDrillSection(
											item,
											values
										);
									let drillLabel = __(
										'Options',
										'modula-best-grid-gallery'
									);
									if (
										typeof item.label === 'string' &&
										item.label.trim() !== ''
									) {
										drillLabel = item.label;
									} else if (typeof item.group === 'string') {
										drillLabel = groupLabel(item.group);
									}
									const aux =
										item.auxiliaryPanel &&
										typeof item.auxiliaryPanel ===
											'object' &&
										typeof item.auxiliaryPanel.kind ===
											'string' &&
										item.auxiliaryPanel.kind !== ''
											? item.auxiliaryPanel
											: null;
									const nestedUpsellGroupedPath =
										typeof item.nestedUpsellGroupedPath ===
										'string'
											? item.nestedUpsellGroupedPath
											: '';
									const hubHelp =
										typeof item.hubHelp === 'string' &&
										item.hubHelp.trim() !== ''
											? item.hubHelp.trim()
											: '';
									return (
										<SettingsPanelDrillRow
											key={`drill-${i}-${j}`}
											section={item}
											label={drillLabel}
											groupedPaths={paths}
											{...(hubHelp !== ''
												? { hubHelp }
												: {})}
											{...(aux
												? { auxiliaryPanel: aux }
												: {})}
											{...(nestedUpsellGroupedPath.trim() !==
											''
												? {
														nestedUpsellGroupedPath,
													}
												: {})}
										/>
									);
								}

								if (
									item.type === 'exit' &&
									typeof item.targetCategory === 'string' &&
									item.targetCategory.trim() !== ''
								) {
									const exitLabel =
										typeof item.label === 'string' &&
										item.label.trim() !== ''
											? item.label
											: __(
													'Related settings',
													'modula-best-grid-gallery'
												);
									const targetLabel =
										typeof item.targetLabel === 'string'
											? item.targetLabel
											: item.targetCategory;
									return (
										<SettingsPanelExitRow
											key={`exit-${i}-${j}`}
											label={exitLabel}
											targetLabel={targetLabel}
											onActivate={() => {
												onExitCategory(
													item.targetCategory.trim()
												);
											}}
										/>
									);
								}

								return null;
							})
							.filter(Boolean);

						if (children.length === 0) {
							return null;
						}

						return (
							<SettingsPanelSection
								key={`submenu-${i}-${submenuLabel || i}`}
								label={submenuLabel}
							>
								{children}
							</SettingsPanelSection>
						);
					})
				}
			</form.Subscribe>
		</div>
	);
}
