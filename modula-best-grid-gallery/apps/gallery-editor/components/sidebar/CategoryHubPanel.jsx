/**
 * Renders `category.hubSections` from `editorNavigation` (PHP): `group`, `drill`, `field`, nested `submenu`.
 */
import { __ } from '@wordpress/i18n';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import SettingsGroupCard from '../schema/SettingsGroupCard';
import CategoryHubDrillRow from './CategoryHubDrillRow';
import SchemaFieldRow from '../schema/SchemaFieldRow';
import { GROUP_LABELS } from '../../constants/editorStructure';
import { hubSectionsNeedFormValues } from '../../logic/editorCategoryHub';
import { getEnrichedFieldByGroupedPath } from '../../data/formSchema';
import { isFieldVisible } from '../../logic/fieldVisibility';
import { getGroupedPathsForHubDrillSection } from '../../utils/getGroupedPathsForHubDrillSection';
import { shouldRenderHubSection } from '../../logic/hubSectionVisibility';
import { getSimpleLinkLightboxSidebarFootnote } from '../lightbox-preview/SimpleLinkLightboxPreviewNotice';

/** @param {Object} section Hub section from editorNavigation. @param {Record<string, Record<string, unknown>>} values Grouped form values. @returns {boolean} */
function isHubSectionVisible(section, values) {
	return shouldRenderHubSection(section, values);
}

/**
 * @param {object} section
 * @param {function(string): string} groupLabel
 * @param {Record<string, Record<string, unknown>>} values
 * @param {string} reactKey
 * @return {import('react').ReactNode}
 */
function renderHubSectionWithValues(section, groupLabel, values, reactKey) {
	if (!section || typeof section !== 'object') {
		return null;
	}
	if (!isHubSectionVisible(section, values)) {
		return null;
	}
	if (section.type === 'group' && typeof section.group === 'string') {
		return <SettingsGroupCard key={reactKey} groupKey={section.group} />;
	}
	if (section.type === 'note') {
		const noteLabel =
			typeof section.label === 'string' ? section.label.trim() : '';
		const noteText =
			typeof section.text === 'string' ? section.text.trim() : '';
		if (noteLabel === '' && noteText === '') {
			return null;
		}
		return (
			<section
				key={reactKey}
				className="modula-settings-editor__section modula-settings-editor__section--hub-note"
				{...(noteLabel !== '' ? { 'aria-label': noteLabel } : {})}
			>
				{noteLabel !== '' ? (
					<div className="modula-settings-editor__field-row modula-settings-editor__field-row--section-heading">
						<div className="modula-settings-editor__section-heading-inner">
							<span className="modula-settings-editor__section-heading-label">
								{noteLabel}
							</span>
						</div>
					</div>
				) : null}
				{noteText !== '' ? (
					<p className="modula-settings-editor__hub-note-text">
						{noteText}
					</p>
				) : null}
			</section>
		);
	}
	if (section.type === 'drill') {
		if (!shouldRenderHubSection(section, values)) {
			return null;
		}
		const paths = getGroupedPathsForHubDrillSection(section, values);
		let drillLabel = __('Options', 'modula-best-grid-gallery');
		if (typeof section.label === 'string' && section.label.trim() !== '') {
			drillLabel = section.label;
		} else if (typeof section.group === 'string') {
			drillLabel = groupLabel(section.group);
		}
		const aux =
			section.auxiliaryPanel &&
			typeof section.auxiliaryPanel === 'object' &&
			typeof section.auxiliaryPanel.kind === 'string' &&
			section.auxiliaryPanel.kind !== ''
				? section.auxiliaryPanel
				: null;
		const nestedUpsellGroupedPath =
			typeof section.nestedUpsellGroupedPath === 'string'
				? section.nestedUpsellGroupedPath
				: '';
		return (
			<CategoryHubDrillRow
				key={reactKey}
				label={drillLabel}
				groupedPaths={paths}
				{...(aux ? { auxiliaryPanel: aux } : {})}
				{...(nestedUpsellGroupedPath.trim() !== ''
					? { nestedUpsellGroupedPath }
					: {})}
			/>
		);
	}
	if (section.type === 'field' && typeof section.groupedPath === 'string') {
		const hit = getEnrichedFieldByGroupedPath(section.groupedPath.trim());
		if (!hit || !isFieldVisible(hit.field, values)) {
			return null;
		}
		const safeId = section.groupedPath.replace(/[^a-z0-9.-]/gi, '-');
		const isEmbeddedField =
			section.fieldPresentation === 'embedded' ||
			section.hubFieldPresentation === 'embedded';
		const hubFieldClass =
			'modula-settings-editor__section modula-settings-editor__section--hub-field' +
			(isEmbeddedField
				? ' modula-settings-editor__section--hub-field-embedded'
				: '');
		const simpleLinkFootnote =
			section.groupedPath.trim() === 'lightbox.lightbox'
				? getSimpleLinkLightboxSidebarFootnote(
						values?.lightbox?.lightbox
					)
				: '';

		return (
			<section
				key={reactKey}
				className={hubFieldClass}
				aria-labelledby={`modula-hub-field-${safeId}`}
			>
				<div className="modula-settings-editor__section-body">
					<div className="modula-settings-editor__fields">
						<SchemaFieldRow
							groupKey={hit.groupId}
							field={hit.field}
							disabled={false}
						/>
						{simpleLinkFootnote ? (
							<p className="modula-settings-editor__hub-v2-setting-footnote">
								{simpleLinkFootnote}
							</p>
						) : null}
					</div>
				</div>
			</section>
		);
	}
	if (section.type === 'submenu' && Array.isArray(section.items)) {
		if (!shouldRenderHubSection(section, values)) {
			return null;
		}
		const submenuLabel =
			typeof section.label === 'string' ? section.label.trim() : '';
		const aria =
			submenuLabel !== ''
				? submenuLabel
				: __('More options', 'modula-best-grid-gallery');
		return (
			<div
				key={reactKey}
				className="modula-settings-editor__category-hub-submenu"
				aria-label={aria}
			>
				<div className="modula-settings-editor__category-hub-submenu-inner">
					{section.items
						.map((item, j) =>
							renderHubSectionWithValues(
								item,
								groupLabel,
								values,
								`${reactKey}-sub-${j}-${item?.group || j}`
							)
						)
						.filter(Boolean)}
				</div>
			</div>
		);
	}
	return null;
}

/**
 * @param {object[]} sections
 * @param {function(string): string} groupLabel
 * @param {Record<string, Record<string, unknown>>} values
 * @param {string} keyPrefix
 * @return {import('react').ReactNode[]}
 */
function renderHubSectionsList(sections, groupLabel, values, keyPrefix) {
	if (!Array.isArray(sections)) {
		return [];
	}
	return sections
		.map((s, i) =>
			renderHubSectionWithValues(
				s,
				groupLabel,
				values,
				`${keyPrefix}-${i}-${s?.type || 'x'}-${s?.group || i}`
			)
		)
		.filter(Boolean);
}

/**
 * @param {Object} props
 * @param {object} props.category Entry from `SETTINGS_EDITOR_CATEGORIES` with `hubSections`.
 */
export default function CategoryHubPanel({ category }) {
	const config = useModulaSettingsEditorConfig();
	const { form } = useGallerySettingsFormBundle();
	const formUi = config.formUi || {};
	const groupLabels = formUi.groupLabels || {};

	const groupLabel = (key) => groupLabels[key] || GROUP_LABELS[key] || key;

	const sections = Array.isArray(category.hubSections)
		? category.hubSections
		: [];

	const needsValues = hubSectionsNeedFormValues(sections);

	const desc =
		typeof category.description === 'string'
			? category.description.trim()
			: '';

	return (
		<div className="modula-settings-editor__category modula-settings-editor__category--hub">
			{desc !== '' ? (
				<p className="modula-settings-editor__category-desc">{desc}</p>
			) : null}
			<div className="modula-settings-editor__sections">
				{needsValues ? (
					<form.Subscribe selector={(s) => s.values}>
						{(values) =>
							renderHubSectionsList(
								sections,
								groupLabel,
								values,
								'hub'
							)
						}
					</form.Subscribe>
				) : (
					renderHubSectionsList(sections, groupLabel, {}, 'hub')
				)}
			</div>
		</div>
	);
}
