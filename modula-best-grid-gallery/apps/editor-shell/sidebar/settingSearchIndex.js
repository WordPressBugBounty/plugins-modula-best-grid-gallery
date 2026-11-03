/**
 * Setting search ("Find a setting…"): an index of every setting the settings
 * panel can render, built from the same navigation the panel walks, and the
 * matching against a query. Visibility (document type, plan, extensions) is
 * applied per form state, so results follow what the panel would show.
 *
 * Each editor binds the rules to its own schema and panel helpers through
 * {@link createSettingSearch}; matching is shared as is.
 */
import {
	fieldDescriptionBlob,
	matchesQueryTokens,
	normalizeBlob,
	tokenizeQuery,
} from './settingSearchText';
import {
	buildSectionKey,
	isMoreSettingsSubmenu,
} from './settingsPanelSectionKeys';

/**
 * @typedef {Record<string, Record<string, unknown>>} GroupedValues
 */

/**
 * A navigation entry the panel draws as a row of its own, without a schema
 * field (the gallery's Zoom on hover toggle).
 *
 * @typedef {Object} SettingSearchItemRow
 * @property {string} anchor Anchor the row carries.
 * @property {string} label  What the result shows.
 */

/**
 * @typedef {Object} SettingSearchBinding
 * @property {(groupedPath: string) => { field: Object, groupId: string }|null|undefined} getFieldByGroupedPath    Enriched field and its form group.
 * @property {(groupId: string) => Object[]|null|undefined}                               getFieldsForGroup        Enriched fields of a form group.
 * @property {(field: Object) => string}                                                  resolveFieldLabel        The label a field row shows.
 * @property {(drill: Object, groupLabels: Record<string, string>) => string}             resolveSectionTitle      A section header's title.
 * @property {(drill: Object, values: GroupedValues) => string[]}                         getDrillPaths            Grouped paths of a drill without `items`.
 * @property {(field: Object) => boolean}                                                 isHubHeadingField        True for section headings (not settings).
 * @property {(category: Object, values: GroupedValues) => boolean}                       isCategoryVisible        Category gate.
 * @property {(container: Object, values: GroupedValues) => boolean}                      shouldRenderHubSection   Submenu, drill or item row gate.
 * @property {(navEntry: Object, values: GroupedValues) => boolean}                       isFieldEntryShown        Navigation `visibleWhen` of a field entry.
 * @property {(field: Object, values: GroupedValues) => boolean}                          isFieldVisible           Schema field gate.
 * @property {(drill: Object, editor: Object) => boolean}                                 isSectionLocked          True while the section's feature is unavailable.
 * @property {(field: Object, editor: Object) => boolean}                                 isFieldLocked            True when the row shows its PRO pill.
 * @property {boolean}                                                                    showsLockedSectionUpsell True when a locked section draws its upsell field as a row; otherwise the panel hides that field.
 * @property {Record<string, SettingSearchItemRow>}                                       [itemRows]               Rows by navigation entry type; other entry types are not settings.
 */

/**
 * @typedef {Object} SettingSearchSection
 * @property {Object} drill Navigation `drill`.
 * @property {string} key   Open state key (`buildSectionKey`).
 */

/**
 * The panel row carries its anchors (`settingAnchorProps`). A `sectionUpsell`
 * entry is a section's upsell field, which shows only while the section is
 * locked.
 *
 * @typedef {Object} SettingSearchEntry
 * @property {string}                 anchor     Grouped path, or an item row's anchor.
 * @property {string}                 resultKey  Entries with one key are one result.
 * @property {string}                 label      What the result shows.
 * @property {string}                 labelBlob  Lowercase label.
 * @property {string}                 searchBlob Lowercase label and description.
 * @property {Object}                 category   Navigation category.
 * @property {string[]}               trail      Category, labelled submenu and section titles.
 * @property {Object[]}               submenus   Submenus above the setting.
 * @property {SettingSearchSection[]} sections   Sections above the setting, outermost first.
 * @property {Object}                 navEntry   Navigation `field`, item row or `sectionUpsell` entry.
 * @property {Object|null}            field      Enriched schema field (null for an item row).
 */

/**
 * @typedef {Object} SettingSearchResult
 * @property {string}   id           The entry's `resultKey`; unique among results.
 * @property {string}   anchor       See {@link SettingSearchEntry}.
 * @property {string}   label        What the result shows.
 * @property {string}   where        "Lightbox › More settings › EXIF".
 * @property {string}   categoryName Category to switch to.
 * @property {string[]} sectionKeys  Sections to open, outermost first.
 * @property {boolean}  locked       The setting shows its PRO pill or upsell.
 */

/**
 * @typedef {SettingSearchResult & { labelBlob: string, searchBlob: string }} ShownSetting
 */

/**
 * @param {Object} entry Submenu.
 * @return {string} Its heading in the panel ("More settings", "Share"), or ''.
 */
function submenuTitle(entry) {
	return typeof entry.label === 'string' ? entry.label.trim() : '';
}

/**
 * @param {Object} field Enriched schema field.
 * @return {string} The row title the field carries, or ''.
 */
function compositeRowTitle(field) {
	const title = field.editorUi?.compositeStackTitle;
	return typeof title === 'string' ? title.trim() : '';
}

/**
 * @param {Object} category
 * @param {string} anchor   Grouped path, row key or item row anchor.
 * @return {string} Results with one key are one result.
 */
function buildResultKey(category, anchor) {
	return `${category.name}:${anchor}`;
}

/**
 * @param {string}      label
 * @param {string}      anchor
 * @param {string}      resultKey Results with one key are one result (a per-device row).
 * @param {Object|null} field
 * @param {Object}      navEntry
 * @param {Object}      place
 * @return {SettingSearchEntry} The index entry.
 */
function createEntry(label, anchor, resultKey, field, navEntry, place) {
	return {
		anchor,
		resultKey,
		label,
		labelBlob: normalizeBlob([label]),
		searchBlob: normalizeBlob([
			label,
			field ? fieldDescriptionBlob(field) : '',
		]),
		category: place.category,
		trail: place.trail,
		submenus: place.submenus,
		sections: place.sections,
		navEntry,
		field,
	};
}

/**
 * @param {SettingSearchEntry} entry
 * @return {Object|undefined} The innermost section above the setting.
 */
function innermostSection(entry) {
	return entry.sections[entry.sections.length - 1]?.drill;
}

/**
 * @param {SettingSearchBinding} binding
 * @return {{
 *   buildSettingSearchIndex: (categories: Object[], groupLabels?: Record<string, string>) => SettingSearchEntry[],
 *   listShownSettings: (index: SettingSearchEntry[], values: GroupedValues, editor: Object) => ShownSetting[],
 * }} Setting search bound to the editor's schema and panel.
 */
export function createSettingSearch(binding) {
	const itemRows = binding.itemRows || {};

	/**
	 * @param {string} row     `editorUi.row` of per-device fields.
	 * @param {string} groupId Their form group.
	 * @return {string} The title one field of the row carries, or ''.
	 */
	function findRowTitle(row, groupId) {
		const mates = (binding.getFieldsForGroup(groupId) || []).filter(
			(mate) => mate.editorUi?.row === row
		);
		return mates.map(compositeRowTitle).find((title) => title !== '') || '';
	}

	/**
	 * Per-device fields share one row under the row's title ("Space between
	 * images"); their own labels only name the device.
	 *
	 * @param {Object} field   Enriched schema field.
	 * @param {string} groupId Its form group.
	 * @return {{ label: string, rowKey: string }} The result's label, and the shared row it belongs to ('' for none).
	 */
	function describeField(field, groupId) {
		const row = field.editorUi?.row;
		const rowTitle =
			typeof row === 'string' && row !== ''
				? findRowTitle(row, groupId)
				: '';
		if (rowTitle !== '') {
			return { label: rowTitle, rowKey: row };
		}
		return { label: binding.resolveFieldLabel(field), rowKey: '' };
	}

	/**
	 * @param {string} type Navigation entry type.
	 * @return {SettingSearchItemRow|null} The item row of that type, if any.
	 */
	function findItemRow(type) {
		return Object.prototype.hasOwnProperty.call(itemRows, type)
			? itemRows[type]
			: null;
	}

	/**
	 * Index every setting of the navigation, in the order the panel renders
	 * them. Build it once per structure; `listShownSettings` applies the
	 * form state.
	 *
	 * @param {Object[]}               categories    Navigation categories.
	 * @param {Record<string, string>} [groupLabels] `formUi.groupLabels` from the editor config.
	 * @return {SettingSearchEntry[]} The index.
	 */
	function buildSettingSearchIndex(categories, groupLabels = {}) {
		/** @type {SettingSearchEntry[]} */
		const out = [];

		const addField = (groupedPath, navEntry, place) => {
			const hit = binding.getFieldByGroupedPath(groupedPath);
			const field = hit?.field;
			if (!field || binding.isHubHeadingField(field)) {
				return;
			}
			const { label, rowKey } = describeField(field, hit.groupId);
			const resultKey = buildResultKey(
				place.category,
				rowKey !== '' ? `row:${rowKey}` : groupedPath
			);
			out.push(
				createEntry(
					label,
					field.groupedPath,
					resultKey,
					field,
					navEntry,
					place
				)
			);
		};

		const visit = (items, place, parentKey) => {
			if (!Array.isArray(items)) {
				return;
			}
			for (const entry of items) {
				if (entry?.type === 'field') {
					addField(entry.groupedPath, entry, place);
					continue;
				}
				if (entry?.type === 'drill') {
					visitDrill(entry, place, buildSectionKey(parentKey, entry));
					continue;
				}
				const itemRow = findItemRow(entry?.type);
				if (itemRow) {
					out.push(
						createEntry(
							itemRow.label,
							itemRow.anchor,
							buildResultKey(place.category, itemRow.anchor),
							null,
							entry,
							place
						)
					);
				}
			}
		};

		const visitDrill = (drill, place, key) => {
			const inner = {
				...place,
				trail: [
					...place.trail,
					binding.resolveSectionTitle(drill, groupLabels),
				],
				sections: [...place.sections, { drill, key }],
			};
			// A locked section shows its upsell field above the rows, even
			// when the field is not one of them (a technical flag).
			if (typeof drill.nestedUpsellGroupedPath === 'string') {
				addField(
					drill.nestedUpsellGroupedPath,
					{ type: 'sectionUpsell' },
					inner
				);
			}
			if (Array.isArray(drill.items)) {
				visit(drill.items, inner, key);
				return;
			}
			// Path lists do not depend on the form state.
			for (const path of binding.getDrillPaths(drill, {})) {
				addField(path, { type: 'field', groupedPath: path }, inner);
			}
		};

		for (const category of categories) {
			for (const submenu of category.hubSections || []) {
				if (submenu?.type !== 'submenu') {
					continue;
				}
				const trail = [category.title, submenuTitle(submenu)].filter(
					(step) => step !== ''
				);
				const items = isMoreSettingsSubmenu(submenu)
					? (submenu.items || []).filter(
							(item) => item?.type === 'drill'
						)
					: submenu.items;
				visit(
					items,
					{ category, trail, submenus: [submenu], sections: [] },
					buildSectionKey(category.name, submenu)
				);
			}
		}
		return out;
	}

	/**
	 * @param {SettingSearchEntry} entry
	 * @param {Object}             editor Editor config (`isPro`, `extensionEntitlements`).
	 * @return {boolean} True when the entry's field is its locked section's upsell field.
	 */
	function isLockedSectionUpsellField(entry, editor) {
		const drill = innermostSection(entry);
		return Boolean(
			entry.field &&
				drill?.nestedUpsellGroupedPath === entry.field.groupedPath &&
				binding.isSectionLocked(drill, editor)
		);
	}

	/**
	 * @param {SettingSearchEntry} entry
	 * @param {Object}             editor
	 * @return {boolean} True when the panel shows the section's upsell in place of the field.
	 */
	function isShownAsSectionUpsell(entry, editor) {
		return (
			binding.showsLockedSectionUpsell &&
			isLockedSectionUpsellField(entry, editor)
		);
	}

	/**
	 * The panel's own rules, from the category down to the row.
	 *
	 * @param {SettingSearchEntry} entry
	 * @param {GroupedValues}      values Grouped form values.
	 * @param {Object}             editor
	 * @return {boolean} Whether the panel renders the setting for this form state.
	 */
	function isSettingShown(entry, values, editor) {
		if (!binding.isCategoryVisible(entry.category, values)) {
			return false;
		}
		const containersShown = [
			...entry.submenus,
			...entry.sections.map(({ drill }) => drill),
		].every((container) =>
			binding.shouldRenderHubSection(container, values)
		);
		if (!containersShown) {
			return false;
		}
		if (!entry.field) {
			return binding.shouldRenderHubSection(entry.navEntry, values);
		}
		if (isShownAsSectionUpsell(entry, editor)) {
			return true;
		}
		// A locked section's upsell field is no row of its own (the panel
		// hides it, and draws the upsell where it has one).
		if (isLockedSectionUpsellField(entry, editor)) {
			return false;
		}
		return (
			entry.navEntry.type === 'field' &&
			binding.isFieldEntryShown(entry.navEntry, values) &&
			binding.isFieldVisible(entry.field, values)
		);
	}

	/**
	 * @param {SettingSearchEntry} entry
	 * @param {Object}             editor
	 * @return {boolean} True when the setting shows a PRO pill or upsell.
	 */
	function isSettingLocked(entry, editor) {
		if (isShownAsSectionUpsell(entry, editor)) {
			return true;
		}
		if (entry.field && binding.isFieldLocked(entry.field, editor)) {
			return true;
		}
		return entry.sections.some(({ drill }) =>
			binding.isSectionLocked(drill, editor)
		);
	}

	/**
	 * The settings the panel would render for this form state, as results.
	 *
	 * @param {SettingSearchEntry[]} index
	 * @param {GroupedValues}        values Grouped form values.
	 * @param {Object}               editor Editor config.
	 * @return {ShownSetting[]} In panel order.
	 */
	function listShownSettings(index, values, editor) {
		/** @type {ShownSetting[]} */
		const out = [];
		for (const entry of index) {
			if (!isSettingShown(entry, values, editor)) {
				continue;
			}
			out.push({
				id: entry.resultKey,
				anchor: entry.anchor,
				label: entry.label,
				where: entry.trail.join(' › '),
				categoryName: entry.category.name,
				sectionKeys: entry.sections.map(({ key }) => key),
				locked: isSettingLocked(entry, editor),
				labelBlob: entry.labelBlob,
				searchBlob: entry.searchBlob,
			});
		}
		return out;
	}

	return { buildSettingSearchIndex, listShownSettings };
}

/**
 * Settings whose label or description holds every word of the query, label
 * matches first, each group in panel order. Matching follows the command
 * palette's rule. A setting that several entries index (the fields of one
 * per-device row, or type-specific variants of one section) is one result.
 *
 * @param {ShownSetting[]} shown From `listShownSettings`.
 * @param {string}         query
 * @return {SettingSearchResult[]} Matches; empty for a blank query.
 */
export function matchSettings(shown, query) {
	const tokens = tokenizeQuery(query);
	if (tokens.length === 0) {
		return [];
	}
	const seen = new Set();
	const byLabel = [];
	const byDescription = [];
	for (const { labelBlob, searchBlob, ...result } of shown) {
		if (seen.has(result.id)) {
			continue;
		}
		if (matchesQueryTokens(labelBlob, tokens)) {
			byLabel.push(result);
		} else if (matchesQueryTokens(searchBlob, tokens)) {
			byDescription.push(result);
		} else {
			continue;
		}
		seen.add(result.id);
	}
	return [...byLabel, ...byDescription];
}
