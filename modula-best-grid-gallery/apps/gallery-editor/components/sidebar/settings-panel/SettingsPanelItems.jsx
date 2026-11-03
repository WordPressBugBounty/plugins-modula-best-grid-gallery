/**
 * The entries of a hub submenu or of a section, in navigation order: runs of
 * fields, sections that expand in place (nested where the navigation nests
 * them), the Zoom on hover toggle and notes. A headless section is a plain
 * box under its host field, whose row carries the box's reset. Dependents
 * that come down to one row draw as that ↳ row, with no box.
 */
import { __, sprintf } from '@wordpress/i18n';
import { Accordion, AccordionSection, PlanBadge, SubgroupIcon } from 'admin-ui';
import {
	DependentRowContext,
	findHeadlessDependents,
	isDependentsSection,
	isSingleRowDependents,
} from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../../form/GallerySettingsFormContext';
import { useSettingsPanelSections } from '../../../context/SettingsPanelSectionsContext';
import { useModulaSettingsEditorConfig } from '../../../hooks/useModulaSettingsEditorConfig';
import {
	getEnrichedFieldByGroupedPath,
	getGroupKeyFromGroupedPath,
} from '../../../data/formSchema';
import {
	buildSectionKey,
	collectSectionResetFields,
	countShownSectionContent,
	groupSectionItems,
	isSectionLocked,
	isSectionOpen,
	resolveSectionTitle,
	sectionItems,
	sectionReset,
	sectionUpsellPath,
} from '../../../logic/settingsPanelSections';
import {
	ZOOM_ON_HOVER_ANCHOR,
	settingAnchorProps,
} from '../../../logic/settingAnchor';
import { getNestedStackRows } from '../../../utils/getNestedStackRows';
import SchemaFieldRow from '../../schema/SchemaFieldRow';
import { resolveLiteUpsell } from '../../../logic/liteUpsell';
import EditorUpsellBlurb from '../../upsell/EditorUpsellBlurb';
import LiteUpsellCard from '../../upsell/LiteUpsellCard';
import ZoomOnHoverHubToggle from '../ZoomOnHoverHubToggle';
import SettingsPanelFieldRows from './SettingsPanelFieldRows';
import SettingsPanelLiteLock from './SettingsPanelLiteLock';

/**
 * @typedef {Object} SettingsPanelItemsProps
 * @property {object[]}                                items        Submenu or drill `items`.
 * @property {string}                                  parentKey    Key of the submenu or section holding them.
 * @property {Record<string, Record<string, unknown>>} values       Grouped form values.
 * @property {2|3|4|5|6}                               headingLevel Heading level of nested sections.
 * @property {RenderField}                             renderField  One field's row.
 * @property {string}                                  [upsellPath] The section's upsell field, shown above the rows instead of its own row.
 */

/**
 * @callback RenderField
 * @param {Object}     field             Enriched schema field.
 * @param {ResetState} [dependentsReset] Reset of the headless box under the field, which its row carries.
 * @return {import('react').ReactNode} The field's row.
 */

/**
 * @typedef {import('editor-shell/logic').ResetState} ResetState
 */

/**
 * @param {SettingsPanelItemsProps} props
 */
export default function SettingsPanelItems({
	items,
	parentKey,
	values,
	headingLevel,
	renderField,
	upsellPath = '',
}) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const headlessByHost = findHeadlessDependents(items);

	/**
	 * A locked section keeps its box, whose header carries the PRO pill and
	 * whose upsell stands in for the locked setting.
	 *
	 * @param {Object} section Navigation `drill`.
	 * @return {boolean} Whether its dependents draw as one ↳ row.
	 */
	const isSingleRow = (section) =>
		!isSectionLocked(section, editor) &&
		isSingleRowDependents(section, () =>
			countShownSectionContent(section, values)
		);

	/**
	 * A single ↳ row keeps its own reset dot, so its host carries the reset
	 * of a headless box only.
	 *
	 * @param {Object} field
	 * @return {import('react').ReactNode} The field's row, carrying the reset of its headless box.
	 */
	const renderRunField = (field) => {
		const box = headlessByHost.get(field.groupedPath);
		return renderField(
			field,
			box && !isSingleRow(box)
				? sectionReset(
						collectSectionResetFields(box, values),
						values,
						form
					)
				: undefined
		);
	};

	/**
	 * @param {Object} section Navigation `drill`.
	 * @param {number} index   Its block's position.
	 * @return {import('react').ReactNode} The section as a ↳ row, a headless box or an accordion.
	 */
	const renderSection = (section, index) => {
		const key = `section-${section.id}-${index}`;
		const sectionKey = buildSectionKey(parentKey, section);
		const content = (
			<SettingsPanelSectionContent
				section={section}
				sectionKey={sectionKey}
				values={values}
				headingLevel={headingLevel}
			/>
		);
		if (isSingleRow(section)) {
			return (
				<div key={key} className="modula-settings-panel__dependent-row">
					<DependentRowContext.Provider value>
						{content}
					</DependentRowContext.Provider>
				</div>
			);
		}
		if (section.headless === true) {
			return (
				<div
					key={key}
					role="group"
					aria-label={section.label}
					className="modula-settings-panel__box modula-settings-panel__dependents"
				>
					{content}
				</div>
			);
		}
		return (
			<Accordion key={key} className="modula-settings-panel__box">
				<SettingsPanelAccordionSection
					section={section}
					sectionKey={sectionKey}
					values={values}
					headingLevel={headingLevel}
				/>
			</Accordion>
		);
	};

	return groupSectionItems(items, values).map((block, index) => {
		if (block.kind === 'fields') {
			const { rows } = getNestedStackRows(
				{
					groupedPaths: block.paths,
					nestedUpsellGroupedPath: upsellPath,
				},
				values
			);
			return (
				<SettingsPanelFieldRows
					key={`fields-${block.paths[0]}`}
					rows={rows}
					renderField={renderRunField}
				/>
			);
		}
		const { entry } = block;
		switch (entry.type) {
			case 'drill':
				return renderSection(entry, index);
			case 'zoomOnHoverToggle':
				return (
					<div
						key={`zoom-on-hover-${index}`}
						className="modula-settings-panel__hub-field"
						{...settingAnchorProps([ZOOM_ON_HOVER_ANCHOR])}
					>
						<ZoomOnHoverHubToggle />
					</div>
				);
			case 'note':
				return (
					<p
						key={`note-${index}`}
						className="modula-settings-panel__note-text"
					>
						{entry.text}
					</p>
				);
			default:
				return null;
		}
	});
}

/**
 * @type {RenderField} The stacked schema row sections use.
 */
function renderSectionField(field, dependentsReset) {
	return (
		<SettingsPanelLiteLock field={field}>
			<SchemaFieldRow
				groupKey={getGroupKeyFromGroupedPath(field)}
				field={field}
				disabled={false}
				variant="stacked"
				dependentsReset={dependentsReset}
			/>
		</SettingsPanelLiteLock>
	);
}

/**
 * A section that expands in place. Its header resets every field of the
 * section (shown while one differs from its default) and shows the PRO pill
 * while the section is locked. Closed sections render no fields.
 *
 * @param {Object}                                  props
 * @param {Object}                                  props.section      Navigation `drill`.
 * @param {string}                                  props.sectionKey   Open state key.
 * @param {Record<string, Record<string, unknown>>} props.values       Grouped form values.
 * @param {2|3|4|5|6}                               props.headingLevel
 */
export function SettingsPanelAccordionSection({
	section,
	sectionKey: key,
	values,
	headingLevel,
}) {
	const { form } = useGallerySettingsFormBundle();
	const editor = useModulaSettingsEditorConfig();
	const { openSections, setSectionOpen } = useSettingsPanelSections();
	const open = isSectionOpen(openSections, key, section);
	const locked = isSectionLocked(section, editor);
	const title = resolveSectionTitle(
		section,
		editor.formUi?.groupLabels || {}
	);
	const { isDirty, reset } = sectionReset(
		collectSectionResetFields(section, values),
		values,
		form
	);

	return (
		<AccordionSection
			title={title}
			open={open}
			onOpenChange={(next) => setSectionOpen(key, next)}
			icon={isDependentsSection(section) ? <SubgroupIcon /> : null}
			badge={locked ? <PlanBadge tone="outline" lock plan="PRO" /> : null}
			{...(isDirty
				? {
						onReset: reset,
						resetLabel: sprintf(
							/* translators: %s: settings section title. */
							__(
								'Reset %s to defaults',
								'modula-best-grid-gallery'
							),
							title
						),
					}
				: {})}
			headingLevel={headingLevel}
		>
			{open ? (
				<SettingsPanelSectionContent
					section={section}
					sectionKey={key}
					values={values}
					headingLevel={Math.min(headingLevel + 1, 6)}
					locked={locked}
				/>
			) : null}
		</AccordionSection>
	);
}

/**
 * @param {Object}                                  props
 * @param {Object}                                  props.section
 * @param {string}                                  props.sectionKey
 * @param {Record<string, Record<string, unknown>>} props.values
 * @param {2|3|4|5|6}                               props.headingLevel Level of sections nested inside.
 * @param {boolean}                                 props.locked       The upsell stands in for the section's upsell field.
 */
function SettingsPanelSectionContent({
	section,
	sectionKey: key,
	values,
	headingLevel,
	locked,
}) {
	const editor = useModulaSettingsEditorConfig();
	const upsellPath = sectionUpsellPath(section);
	const upsellHit = upsellPath
		? getEnrichedFieldByGroupedPath(upsellPath)
		: null;
	const liteUpsell = upsellHit
		? resolveLiteUpsell(upsellHit.field.schema, editor)
		: null;
	let upsell = null;
	if (liteUpsell) {
		upsell = <LiteUpsellCard upsell={liteUpsell} variant="section" />;
	} else if (upsellHit) {
		upsell = (
			<EditorUpsellBlurb
				field={upsellHit.field}
				wrapperClassName="modula-settings-panel__section-upsell"
			/>
		);
	}

	return (
		<div className="modula-settings-panel__section-fields">
			{/* While locked, the upsell is the row Setting search lands on. */}
			{locked && upsell ? (
				<div {...settingAnchorProps([upsellPath])}>{upsell}</div>
			) : (
				upsell
			)}
			<SettingsPanelItems
				items={sectionItems(section, values)}
				parentKey={key}
				values={values}
				headingLevel={headingLevel}
				renderField={renderSectionField}
				upsellPath={upsellPath}
			/>
		</div>
	);
}
