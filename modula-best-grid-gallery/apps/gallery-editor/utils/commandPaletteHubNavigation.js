/**
 * Open the correct hub nested stack frame when jumping to a field from the command palette.
 */
import { __ } from '@wordpress/i18n';
import { GROUP_LABELS, SETTINGS_EDITOR_CATEGORIES } from '../constants/editorStructure';
import { categoryHasHubSections } from '../logic/editorCategoryHub';
import { getGroupedPathsForHubDrillSection } from './getGroupedPathsForHubDrillSection';

/**
 * @param {object} section Hub `drill` section from editor navigation.
 * @return {string}
 */
function resolveHubDrillTitle(section) {
	if (
		section &&
		typeof section.label === 'string' &&
		section.label.trim() !== ''
	) {
		return section.label.trim();
	}
	if (typeof section?.group === 'string' && section.group !== '') {
		return GROUP_LABELS[section.group] || section.group;
	}
	return __('Options', 'modula-best-grid-gallery');
}

/**
 * Walk hub sections (including nested `submenu` items) and find a drill whose resolved paths
 * include `groupedPath`.
 *
 * @param {object[]|null|undefined} sections
 * @param {string}                  groupedPath
 * @param {Record<string, Record<string, unknown>>} values Form values (grouped).
 * @return {import('../context/TakeoverSidebarStackContext').SidebarNestedFrame | null}
 */
function findFrameInHubSections(sections, groupedPath, values) {
	if (!Array.isArray(sections)) {
		return null;
	}
	const want = groupedPath.trim();
	for (const section of sections) {
		if (!section || typeof section !== 'object') {
			continue;
		}
		if (section.type === 'submenu' && Array.isArray(section.items)) {
			const nested = findFrameInHubSections(section.items, want, values);
			if (nested) {
				return nested;
			}
			continue;
		}
		if (section.type !== 'drill') {
			continue;
		}
		const paths = getGroupedPathsForHubDrillSection(section, values);
		if (!paths.includes(want)) {
			continue;
		}
		const title = resolveHubDrillTitle(section);
		/** @type {import('../context/TakeoverSidebarStackContext').SidebarNestedFrame} */
		const frame = {
			title,
			groupedPaths: paths,
		};
		if (
			section.auxiliaryPanel &&
			typeof section.auxiliaryPanel === 'object' &&
			typeof section.auxiliaryPanel.kind === 'string' &&
			section.auxiliaryPanel.kind !== ''
		) {
			frame.auxiliaryPanel = section.auxiliaryPanel;
		}
		return frame;
	}
	return null;
}

/**
 * @param {object|null|undefined} category Entry from `SETTINGS_EDITOR_CATEGORIES`.
 * @param {string}                groupedPath
 * @param {Record<string, Record<string, unknown>>} values
 * @return {import('../context/TakeoverSidebarStackContext').SidebarNestedFrame | null}
 */
export function findHubStackFrameForGroupedPath(category, groupedPath, values) {
	if (
		!category ||
		!groupedPath ||
		typeof groupedPath !== 'string' ||
		groupedPath.trim() === ''
	) {
		return null;
	}
	if (!categoryHasHubSections(category)) {
		return null;
	}
	return findFrameInHubSections(
		category.hubSections,
		groupedPath.trim(),
		values
	);
}

/**
 * After switching category, open the hub drill that contains the field (if any).
 * Schedules stack updates on the next macrotask so `CategoryPanelContent`’s `clearStack` effect runs first.
 *
 * @param {object} target Command palette target (`kind`, `categoryName`, `groupedPath`, …).
 * @param {Record<string, Record<string, unknown>>} values Grouped form values.
 * @param {{ clearStack: Function, pushFrame: Function }} stack
 * @return {boolean} Whether a nested hub frame was scheduled.
 */
export function applyCommandPaletteHubNavigation(target, values, stack) {
	if (
		!target ||
		target.kind !== 'field' ||
		!target.groupedPath ||
		typeof target.groupedPath !== 'string'
	) {
		return false;
	}
	if (
		!stack ||
		typeof stack.clearStack !== 'function' ||
		typeof stack.pushFrame !== 'function'
	) {
		return false;
	}
	const category = SETTINGS_EDITOR_CATEGORIES.find(
		(c) => c.name === target.categoryName
	);
	const frame = findHubStackFrameForGroupedPath(
		category,
		target.groupedPath.trim(),
		values
	);
	if (!frame) {
		return false;
	}
	window.setTimeout(() => {
		stack.clearStack();
		stack.pushFrame(frame);
	}, 0);
	return true;
}
