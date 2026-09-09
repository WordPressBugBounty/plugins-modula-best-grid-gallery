/**
 * Hub drill / nested section visibility after field gates.
 *
 * Headings are not visible children: nested stacks drop orphan headings, so a
 * drill of Lite-gated fields plus section titles would otherwise stay in the hub
 * and open empty.
 *
 * @package
 */

import { evaluateWhen, isFieldVisible } from './fieldVisibility';
import { getEnrichedFieldByGroupedPath } from '../data/formSchema';
import { getGroupedPathsForHubDrillSection } from '../utils/getGroupedPathsForHubDrillSection';

/**
 * @param {object|null|undefined} field
 * @return {boolean}
 */
export function isHubHeadingField(field) {
	return field?.control?.kind === 'heading';
}

/**
 * @param {object|null|undefined}                   field
 * @param {Record<string, Record<string, unknown>>} groupedValues
 * @return {boolean}
 */
export function isVisibleHubChildField(field, groupedValues) {
	if (!field) {
		return false;
	}
	if (isHubHeadingField(field)) {
		return false;
	}
	return isFieldVisible(field, groupedValues);
}

/**
 * @param {object[]|null|undefined}                 fields
 * @param {Record<string, Record<string, unknown>>} groupedValues
 * @return {boolean}
 */
export function hubChildFieldsHaveVisibleContent(fields, groupedValues) {
	if (!Array.isArray(fields) || fields.length === 0) {
		return false;
	}
	return fields.some((field) =>
		isVisibleHubChildField(field, groupedValues)
	);
}

/**
 * @param {string[]|null|undefined}                 paths
 * @param {Record<string, Record<string, unknown>>} groupedValues
 * @return {boolean}
 */
export function hubPathsHaveVisibleChildren(paths, groupedValues) {
	if (!Array.isArray(paths) || paths.length === 0) {
		return false;
	}
	const fields = [];
	for (const p of paths) {
		if (typeof p !== 'string') {
			continue;
		}
		const hit = getEnrichedFieldByGroupedPath(p.trim());
		if (hit?.field) {
			fields.push(hit.field);
		}
	}
	return hubChildFieldsHaveVisibleContent(fields, groupedValues);
}

/**
 * @param {object|null|undefined} section
 * @return {boolean}
 */
export function hubDrillHasUpsellFallback(section) {
	const path =
		typeof section?.nestedUpsellGroupedPath === 'string'
			? section.nestedUpsellGroupedPath.trim()
			: '';
	if (!path) {
		return false;
	}
	return Boolean(getEnrichedFieldByGroupedPath(path));
}

/**
 * @param {object|null|undefined}                   section
 * @param {Record<string, Record<string, unknown>>} groupedValues
 * @return {boolean}
 */
export function shouldRenderHubDrill(section, groupedValues) {
	if (!section || typeof section !== 'object') {
		return false;
	}
	if (
		section.visibleWhen &&
		typeof section.visibleWhen === 'object' &&
		!evaluateWhen(section.visibleWhen, groupedValues)
	) {
		return false;
	}
	if (hubDrillHasUpsellFallback(section)) {
		return true;
	}
	const paths = getGroupedPathsForHubDrillSection(section, groupedValues);
	return hubPathsHaveVisibleChildren(paths, groupedValues);
}

/**
 * @param {object|null|undefined}                   section
 * @param {Record<string, Record<string, unknown>>} groupedValues
 * @return {boolean}
 */
export function shouldRenderHubSection(section, groupedValues) {
	if (!section || typeof section !== 'object') {
		return false;
	}
	if (
		section.visibleWhen &&
		typeof section.visibleWhen === 'object' &&
		!evaluateWhen(section.visibleWhen, groupedValues)
	) {
		return false;
	}

	if (section.type === 'drill') {
		return shouldRenderHubDrill(section, groupedValues);
	}

	if (section.type === 'submenu') {
		return (
			Array.isArray(section.items) &&
			section.items.some((item) =>
				shouldRenderHubSection(item, groupedValues)
			)
		);
	}

	if (section.type === 'field') {
		if (
			typeof section.groupedPath !== 'string' ||
			section.groupedPath.trim() === ''
		) {
			return false;
		}
		const hit = getEnrichedFieldByGroupedPath(section.groupedPath.trim());
		return Boolean(
			hit?.field && isVisibleHubChildField(hit.field, groupedValues)
		);
	}

	if (section.type === 'note') {
		const noteLabel =
			typeof section.label === 'string' ? section.label.trim() : '';
		const noteText =
			typeof section.text === 'string' ? section.text.trim() : '';
		return noteLabel !== '' || noteText !== '';
	}

	if (section.type === 'group' && typeof section.group === 'string') {
		return section.group.trim() !== '';
	}

	if (
		section.type === 'exit' &&
		typeof section.targetCategory === 'string'
	) {
		return section.targetCategory.trim() !== '';
	}

	return true;
}

/**
 * Category with hubSections is hidden when every section has zero visible children.
 * Categories without hubSections keep their `visibleWhen` result.
 *
 * @param {object}                                  category
 * @param {Record<string, Record<string, unknown>>} groupedValues
 * @return {boolean}
 */
export function hubCategoryHasVisibleContent(category, groupedValues) {
	const sections = Array.isArray(category?.hubSections)
		? category.hubSections
		: null;
	if (!sections) {
		return true;
	}
	if (sections.length === 0) {
		return false;
	}
	return sections.some((section) =>
		shouldRenderHubSection(section, groupedValues)
	);
}
