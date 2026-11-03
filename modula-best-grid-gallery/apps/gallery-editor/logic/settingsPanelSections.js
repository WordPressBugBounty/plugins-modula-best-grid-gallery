/**
 * Settings panel sections (hub boxes and "More settings" accordions): how a
 * section is keyed, whether it is open or locked, and which fields it resets.
 */
import { __ } from '@wordpress/i18n';
import { countShownBlocks, isDependentsSection } from 'editor-shell/logic';
import { GROUP_LABELS } from '../constants/editorStructure';
import { getEnrichedFieldByGroupedPath } from '../data/formSchema';
import { getGroupedPathsForHubDrillSection } from '../utils/getGroupedPathsForHubDrillSection';
import { getNestedStackRows } from '../utils/getNestedStackRows';
import { evaluateWhen } from './fieldVisibility';
import { shouldRenderHubSection } from './hubSectionVisibility';
import { getByPath } from './getByPath';
import { shouldHideFieldForPanelUpsell } from './proGateLock';
import {
	isPresentationOnlyField,
	isSettingsValueAtDefault,
	resetSettingsFieldValue,
} from './settingsFieldDefault';

// Section keys are shared with Setting search through the editor shell.
export { buildSectionKey, isMoreSettingsSubmenu } from 'editor-shell/logic';

/**
 * @param {Object}                 section     Navigation `drill`.
 * @param {Record<string, string>} groupLabels Group labels from the editor config.
 * @return {string} The section header's title.
 */
export function resolveSectionTitle(section, groupLabels) {
	if (typeof section.label === 'string' && section.label.trim() !== '') {
		return section.label;
	}
	if (typeof section.group === 'string') {
		return (
			groupLabels[section.group] ||
			GROUP_LABELS[section.group] ||
			section.group
		);
	}
	return __('Options', 'modula-best-grid-gallery');
}

/**
 * A headless section (no header to toggle it) is always open. A section the
 * user has not toggled starts as the canvas draws it: the settings nested
 * under a field open, other sections closed. A drill's `defaultOpen`
 * overrides that.
 *
 * @param {Record<string, boolean>} openSections What the user chose, by key.
 * @param {string}                  key          The section's key.
 * @param {Object}                  section      Navigation `drill`.
 * @return {boolean} Whether the section is open.
 */
export function isSectionOpen(openSections, key, section) {
	if (section.headless === true) {
		return true;
	}
	if (typeof openSections[key] === 'boolean') {
		return openSections[key];
	}
	if (typeof section.defaultOpen === 'boolean') {
		return section.defaultOpen;
	}
	return isDependentsSection(section);
}

/**
 * A section is locked while its feature is not available: its
 * `nestedUpsellGroupedPath` field shows the upsell in place of the setting
 * (Lite, or Pro without the extension). The header then shows the PRO pill.
 *
 * @param {Object} section Navigation `drill`.
 * @param {Object} editor  Editor config (`isPro`, `extensionEntitlements`).
 * @return {boolean} Whether the section is locked.
 */
export function isSectionLocked(section, editor) {
	if (typeof section.nestedUpsellGroupedPath !== 'string') {
		return false;
	}
	const hit = getEnrichedFieldByGroupedPath(section.nestedUpsellGroupedPath);
	return Boolean(
		hit && shouldHideFieldForPanelUpsell(hit.field, section, editor)
	);
}

/**
 * @typedef {import('editor-shell/logic').SectionBlock} SectionBlock
 */

/**
 * @param {Object}                                  entry  Navigation `field`.
 * @param {Record<string, Record<string, unknown>>} values
 * @return {boolean} Whether the navigation shows the field. Schema rules
 *                   (gallery type, Lite) apply later, per field.
 */
export function isFieldEntryShown(entry, values) {
	return !entry.visibleWhen || evaluateWhen(entry.visibleWhen, values);
}

/**
 * The entries of a hub submenu or a section as render blocks: consecutive
 * fields form one run, so per-device fields can share a row; any other entry
 * (nested section, Zoom on hover, note) is its own block while it is shown.
 *
 * @param {Object[]}                                items  Submenu or drill `items`.
 * @param {Record<string, Record<string, unknown>>} values Grouped form values.
 * @return {SectionBlock[]} Blocks in navigation order.
 */
export function groupSectionItems(items, values) {
	const blocks = [];
	for (const entry of items) {
		if (entry?.type !== 'field') {
			if (shouldRenderHubSection(entry, values)) {
				blocks.push({ kind: 'entry', entry });
			}
			continue;
		}
		if (!isFieldEntryShown(entry, values)) {
			continue;
		}
		const last = blocks[blocks.length - 1];
		if (last?.kind === 'fields') {
			last.paths.push(entry.groupedPath);
			continue;
		}
		blocks.push({ kind: 'fields', paths: [entry.groupedPath] });
	}
	return blocks;
}

/**
 * @param {Object}                                  section Navigation `drill`.
 * @param {Record<string, Record<string, unknown>>} values  Grouped form values.
 * @return {Object[]} The section's entries: its `items`, else its grouped paths as fields.
 */
export function sectionItems(section, values) {
	return Array.isArray(section.items)
		? section.items
		: getGroupedPathsForHubDrillSection(section, values).map(
				(groupedPath) => ({ type: 'field', groupedPath })
			);
}

/**
 * @param {Object} section Navigation `drill`.
 * @return {string} The section's upsell field, hidden while the section is locked.
 */
export function sectionUpsellPath(section) {
	return typeof section.nestedUpsellGroupedPath === 'string'
		? section.nestedUpsellGroupedPath
		: '';
}

/**
 * What a section shows now, counted as the panel draws it: field rows (a
 * per-device row counts once) and the other entries inside it. The upsell a
 * locked section shows above its rows is not counted: a locked section
 * keeps its box (see `SettingsPanelItems`).
 *
 * @param {Object}                                  section Navigation `drill`.
 * @param {Record<string, Record<string, unknown>>} values  Grouped form values.
 * @return {import('editor-shell/logic').ShownSectionContent} Shown rows and sections.
 */
export function countShownSectionContent(section, values) {
	return countShownBlocks(
		groupSectionItems(sectionItems(section, values), values),
		(paths) =>
			getNestedStackRows(
				{
					groupedPaths: paths,
					nestedUpsellGroupedPath: sectionUpsellPath(section),
				},
				values
			).rows.length
	);
}

/**
 * @typedef {Object} SectionResetField
 * @property {string} path    Grouped path (`group.key`).
 * @property {string} groupId Form group.
 * @property {Object} field   Enriched schema field.
 */

/**
 * Fields the section header's reset restores: every stored field of the
 * section and of its nested sections, whether shown or not, so a reset leaves
 * no hidden customisation behind. Headings and callouts store nothing.
 *
 * @param {Object}                                  section Navigation `drill`.
 * @param {Record<string, Record<string, unknown>>} values  Grouped form values.
 * @return {SectionResetField[]} In navigation order.
 */
export function collectSectionResetFields(section, values) {
	const out = [];
	for (const path of getGroupedPathsForHubDrillSection(section, values)) {
		const hit = getEnrichedFieldByGroupedPath(path);
		if (!hit?.field || isPresentationOnlyField(hit.field)) {
			continue;
		}
		out.push({ path, groupId: hit.groupId, field: hit.field });
	}
	return out;
}

/**
 * @typedef {import('editor-shell/logic').ResetState} ResetState
 */

/**
 * @param {SectionResetField[]}                     fields From `collectSectionResetFields`.
 * @param {Record<string, Record<string, unknown>>} values Grouped form values.
 * @param {Object}                                  [form] Form the reset writes to.
 * @return {ResetState} The section's reset.
 */
export function sectionReset(fields, values, form) {
	return {
		isDirty: fields.some(
			({ path, field }) =>
				!isSettingsValueAtDefault(getByPath(values, path), field.schema)
		),
		reset: () => {
			fields.forEach(({ path, groupId, field }) => {
				resetSettingsFieldValue(
					form,
					`${groupId}.${field.groupedKey}`,
					field.schema,
					path
				);
			});
		},
	};
}
