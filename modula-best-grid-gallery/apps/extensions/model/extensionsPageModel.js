import { __ } from '@wordpress/i18n';

/**
 * @typedef {Object} ExtensionRow
 * @property {string}      slug        Catalog slug (modula-video).
 * @property {string}      name        Display name.
 * @property {string}      description One-line description.
 * @property {boolean}     available   The site's license covers it.
 * @property {boolean}     active      Turned on; only an available extension is.
 * @property {string|null} settings    Settings address, from Compatible Pro.
 */

/**
 * @typedef {Object} PlanGroup
 * @property {string}         plan        Plan slug (starter, trio, business).
 * @property {string}         label       Plan name.
 * @property {boolean}        covered     The site has this plan's extensions.
 * @property {string|null}    upgrade_url Pricing page for the plan; null when the
 *                                        plan offers no upgrade (covered, or the
 *                                        license expired past renewal grace).
 * @property {ExtensionRow[]} extensions  In catalog order.
 */

/**
 * @typedef {'all' | 'active' | 'inactive'} ExtensionFilter
 */

/**
 * @typedef {Object} FilterDefinition
 * @property {(row: ExtensionRow) => boolean} matches Whether the filter shows the extension.
 * @property {() => string}                   label   Filter name.
 * @property {() => string}                   empty   Table message when it shows no extension.
 */

/**
 * The filters, in display order.
 *
 * @type {Record<ExtensionFilter, FilterDefinition>}
 */
const FILTERS = {
	all: {
		matches: () => true,
		label: () => __('All', 'modula-best-grid-gallery'),
		empty: () => __('Nothing here', 'modula-best-grid-gallery'),
	},
	active: {
		matches: (row) => row.active,
		label: () => __('Active', 'modula-best-grid-gallery'),
		empty: () => __('No active extensions', 'modula-best-grid-gallery'),
	},
	inactive: {
		matches: (row) => !row.active,
		label: () => __('Inactive', 'modula-best-grid-gallery'),
		empty: () => __('No inactive extensions', 'modula-best-grid-gallery'),
	},
};

/** @type {ExtensionFilter[]} Filters in display order. */
export const EXTENSION_FILTERS = Object.keys(FILTERS);

/**
 * One filter's definition.
 *
 * @param {ExtensionFilter} filter
 * @return {FilterDefinition} Definition.
 */
function filterDefinition(filter) {
	if (!Object.prototype.hasOwnProperty.call(FILTERS, filter)) {
		throw new Error(`Unknown extensions filter: ${filter}`);
	}

	return FILTERS[filter];
}

/**
 * The filter's name.
 *
 * @param {ExtensionFilter} filter
 * @return {string} Label.
 */
export function filterLabel(filter) {
	return filterDefinition(filter).label();
}

/**
 * Whether the filter shows an extension in the given state.
 *
 * @param {ExtensionFilter}              filter
 * @param {Pick<ExtensionRow, 'active'>} row
 * @return {boolean} Shown.
 */
export function filterShows(filter, row) {
	return filterDefinition(filter).matches(row);
}

/**
 * Number of extensions each filter shows.
 *
 * @param {PlanGroup[]} groups
 * @return {Record<ExtensionFilter, number>} Counts.
 */
export function filterCounts(groups) {
	const rows = groups.flatMap((group) => group.extensions);

	return Object.fromEntries(
		EXTENSION_FILTERS.map((filter) => [
			filter,
			rows.filter(FILTERS[filter].matches).length,
		])
	);
}

/**
 * The groups with only the extensions the filter shows; a group left
 * without extensions is dropped.
 *
 * @param {PlanGroup[]}     groups
 * @param {ExtensionFilter} filter
 * @return {PlanGroup[]} Groups in catalog order.
 */
export function visibleGroups(groups, filter) {
	const { matches } = filterDefinition(filter);

	return groups
		.map((group) => ({
			...group,
			extensions: group.extensions.filter(matches),
		}))
		.filter((group) => group.extensions.length > 0);
}

/**
 * Table message when the filter shows no extension.
 *
 * @param {ExtensionFilter} filter
 * @return {string} Message.
 */
export function emptyFilterMessage(filter) {
	return filterDefinition(filter).empty();
}
