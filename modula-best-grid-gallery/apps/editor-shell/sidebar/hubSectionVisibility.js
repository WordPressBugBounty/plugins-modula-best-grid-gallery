/**
 * Category hub drill / nested section visibility after field gates.
 *
 * Headings are not visible children: nested stacks drop orphan headings, so a
 * drill of gated fields plus section titles would otherwise stay in the hub and
 * open empty. Each editor supplies its own schema lookups; the rules are shared.
 *
 * @package
 */

/**
 * @typedef {Object} HubSectionVisibilitySchema
 * @property {(when: object, groupedValues: Record<string, Record<string, unknown>>) => boolean}     evaluateWhen          Evaluates a schema `visibleWhen` rule.
 * @property {(field: object, groupedValues: Record<string, Record<string, unknown>>) => boolean}    isFieldVisible        Field gate (Lite/Pro, `visibleWhen`).
 * @property {(groupedPath: string) => object|null|undefined}                                        getFieldByGroupedPath Enriched field for a grouped path.
 * @property {(section: object, groupedValues: Record<string, Record<string, unknown>>) => string[]} getDrillPaths         Grouped paths a drill section opens.
 */

/**
 * @param {HubSectionVisibilitySchema} schema
 * @return {{
 *   isHubHeadingField: (field: object|null|undefined) => boolean,
 *   isVisibleHubChildField: (field: object|null|undefined, groupedValues: Record<string, Record<string, unknown>>) => boolean,
 *   hubChildFieldsHaveVisibleContent: (fields: object[]|null|undefined, groupedValues: Record<string, Record<string, unknown>>) => boolean,
 *   hubPathsHaveVisibleChildren: (paths: string[]|null|undefined, groupedValues: Record<string, Record<string, unknown>>) => boolean,
 *   hubDrillHasUpsellFallback: (section: object|null|undefined) => boolean,
 *   shouldRenderHubDrill: (section: object|null|undefined, groupedValues: Record<string, Record<string, unknown>>) => boolean,
 *   shouldRenderHubSection: (section: object|null|undefined, groupedValues: Record<string, Record<string, unknown>>) => boolean,
 *   hubCategoryHasVisibleContent: (category: object, groupedValues: Record<string, Record<string, unknown>>) => boolean,
 * }} Visibility rules bound to the editor schema.
 */
export function createHubSectionVisibility({
	evaluateWhen,
	isFieldVisible,
	getFieldByGroupedPath,
	getDrillPaths,
}) {
	/**
	 * @param {object|null|undefined} field
	 * @return {boolean} True for section headings.
	 */
	function isHubHeadingField(field) {
		return field?.control?.kind === 'heading';
	}

	/**
	 * @param {object|null|undefined}                   field
	 * @param {Record<string, Record<string, unknown>>} groupedValues
	 * @return {boolean} True when the field renders as a hub child.
	 */
	function isVisibleHubChildField(field, groupedValues) {
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
	 * @return {boolean} True when any field renders.
	 */
	function hubChildFieldsHaveVisibleContent(fields, groupedValues) {
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
	 * @return {boolean} True when any path resolves to a rendered field.
	 */
	function hubPathsHaveVisibleChildren(paths, groupedValues) {
		if (!Array.isArray(paths) || paths.length === 0) {
			return false;
		}
		const fields = [];
		for (const p of paths) {
			if (typeof p !== 'string') {
				continue;
			}
			const field = getFieldByGroupedPath(p.trim());
			if (field) {
				fields.push(field);
			}
		}
		return hubChildFieldsHaveVisibleContent(fields, groupedValues);
	}

	/**
	 * @param {object|null|undefined} section
	 * @return {boolean} True when the drill shows an upsell instead of empty content.
	 */
	function hubDrillHasUpsellFallback(section) {
		const path =
			typeof section?.nestedUpsellGroupedPath === 'string'
				? section.nestedUpsellGroupedPath.trim()
				: '';
		if (!path) {
			return false;
		}
		return Boolean(getFieldByGroupedPath(path));
	}

	/**
	 * @param {object|null|undefined}                   section
	 * @param {Record<string, Record<string, unknown>>} groupedValues
	 * @return {boolean} True when the drill opens visible content.
	 */
	function shouldRenderHubDrill(section, groupedValues) {
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
		const paths = getDrillPaths(section, groupedValues);
		return hubPathsHaveVisibleChildren(paths, groupedValues);
	}

	/**
	 * @param {object|null|undefined}                   section
	 * @param {Record<string, Record<string, unknown>>} groupedValues
	 * @return {boolean} True when the section renders in the hub.
	 */
	function shouldRenderHubSection(section, groupedValues) {
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
			const field = getFieldByGroupedPath(section.groupedPath.trim());
			return Boolean(
				field && isVisibleHubChildField(field, groupedValues)
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
	 * @param {Object}                                  category
	 * @param {Record<string, Record<string, unknown>>} groupedValues
	 * @return {boolean} True when the category has any visible section.
	 */
	function hubCategoryHasVisibleContent(category, groupedValues) {
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

	return {
		isHubHeadingField,
		isVisibleHubChildField,
		hubChildFieldsHaveVisibleContent,
		hubPathsHaveVisibleChildren,
		hubDrillHasUpsellFallback,
		shouldRenderHubDrill,
		shouldRenderHubSection,
		hubCategoryHasVisibleContent,
	};
}
