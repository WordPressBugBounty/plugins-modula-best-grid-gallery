/**
 * Filter bar settings + layout helpers.
 *
 * @package
 */

import { getForcedPreviewViewport } from './resolvePreviewViewport';

/** Select option value for the aggregate “All” filter. */
export const FILTER_SELECT_ALL_VALUE = '__modula_filter_all__';

/** Phone breakpoint for filter-bar dropdown / collapse (WP admin mobile). */
export const FILTER_BAR_PHONE_MAX_PX = 782;

/** @type {string} */
export const FILTER_BAR_PHONE_MQ = `(max-width: ${FILTER_BAR_PHONE_MAX_PX}px)`;

const FILTER_BAR_COLLAPSE_DEFAULT_LABEL = 'Filter by';

/**
 * @param {unknown} value
 * @return {boolean}
 */
function isTruthyFilterFlag(value) {
	return value === true || value === 1 || value === '1';
}

/**
 * @return {boolean}
 */
function matchesFilterBarPhoneMedia() {
	if (
		typeof window === 'undefined' ||
		typeof window.matchMedia !== 'function'
	) {
		return false;
	}
	try {
		return window.matchMedia(FILTER_BAR_PHONE_MQ).matches;
	} catch {
		return false;
	}
}

/**
 * Phone vs not, for filter-bar mobile modes. Editor preview uses the forced
 * viewport (canvas device), not the admin window width.
 *
 * @param {Object|null|undefined} config
 * @param {'desktop'|'tablet'|'mobile'|null|undefined} [previewViewport]
 * @return {boolean}
 */
export function isFilterBarPhoneViewport(config, previewViewport) {
	const forced =
		previewViewport === 'desktop' ||
		previewViewport === 'tablet' ||
		previewViewport === 'mobile'
			? previewViewport
			: getForcedPreviewViewport(config);
	if (forced) {
		return forced === 'mobile';
	}
	return matchesFilterBarPhoneMedia();
}

/**
 * Always-on dropdown, or dropdown only on phones.
 *
 * @param {{ dropdownFilters?: unknown, enableMobileDropdownFilters?: unknown, isPhone?: boolean }} args
 * @return {boolean}
 */
export function shouldUseFilterDropdown({
	dropdownFilters,
	enableMobileDropdownFilters,
	isPhone,
}) {
	if (isTruthyFilterFlag(dropdownFilters)) {
		return true;
	}
	return !!(isTruthyFilterFlag(enableMobileDropdownFilters) && isPhone);
}

/**
 * Collapse-on-phones: list hides behind a toggle. Dropdown modes win.
 *
 * @param {{
 *   enableCollapsibleFilters?: unknown,
 *   dropdownFilters?: unknown,
 *   enableMobileDropdownFilters?: unknown,
 *   isPhone?: boolean,
 * }} args
 * @return {boolean}
 */
export function shouldUseCollapsibleFilterBar({
	enableCollapsibleFilters,
	dropdownFilters,
	enableMobileDropdownFilters,
	isPhone,
}) {
	if (!isPhone || !isTruthyFilterFlag(enableCollapsibleFilters)) {
		return false;
	}
	if (isTruthyFilterFlag(dropdownFilters)) {
		return false;
	}
	if (isTruthyFilterFlag(enableMobileDropdownFilters)) {
		return false;
	}
	return true;
}

/**
 * @param {Object|null|undefined} filtersSettings
 * @param {Object|null|undefined} [config]
 * @return {string}
 */
export function resolveFilterBarCollapsibleActionText(filtersSettings, config) {
	const raw =
		filtersSettings?.collapsibleActionText ?? config?.collapsibleActionText;
	if (typeof raw === 'string' && raw.trim() !== '') {
		return raw.trim();
	}
	return FILTER_BAR_COLLAPSE_DEFAULT_LABEL;
}

/**
 * @param {Object} settings Grouped v2 settings.
 * @return {{ enabled: boolean, type: string, activeFilters: Array, availableFilters: Array }}
 */
export function buildFilteringFromSettings(settings) {
	const fg = settings?.filters || {};
	const names = Array.isArray(fg.filters) ? fg.filters : [];
	/** @type {Array<{ key: string, label: string, value: string }>} */
	const availableFilters = [];

	names.forEach((name) => {
		const trimmed =
			typeof name === 'string' ? name.trim() : String(name ?? '').trim();
		if (!trimmed) {
			return;
		}
		availableFilters.push({
			key: 'category',
			label: trimmed,
			value: trimmed,
		});
	});

	const showRaw = fg.showFilterBar;
	const showFilterBar =
		showRaw === undefined || showRaw === null || showRaw === ''
			? true
			: showRaw === true || showRaw === 1 || showRaw === '1';

	return {
		enabled: showFilterBar && availableFilters.length > 0,
		type: 'client',
		activeFilters: [],
		availableFilters,
	};
}

/**
 * Normalize a filter entry from Redux / settings into key/label/value.
 *
 * @param {Object} filter
 * @param {number} index
 * @return {{ key: string, label: string, value: string, optionValue: string }}
 */
export function normalizeFilterBarEntry(filter, index = 0) {
	const key = filter?.key ?? filter?.slug ?? filter?.id ?? 'category';
	const label = filter?.label ?? filter?.name ?? key;
	const value = filter?.value ?? filter?.slug ?? label;
	return {
		key: String(key),
		label: String(label),
		value: value === undefined || value === null ? '' : String(value),
		optionValue: `f:${index}`,
	};
}

/**
 * @param {unknown} defaultActive
 * @return {boolean}
 */
export function isFilterBarDefaultAll(defaultActive) {
	if (typeof defaultActive !== 'string') {
		return true;
	}
	const def = defaultActive.trim();
	return !def || def.toLowerCase() === 'all';
}

/**
 * @param {{ value?: string, label?: string }|null|undefined} entry
 * @param {unknown} defaultActive
 * @return {boolean}
 */
export function filterEntryMatchesDefaultActive(entry, defaultActive) {
	if (isFilterBarDefaultAll(defaultActive)) {
		return false;
	}
	const def = String(defaultActive).trim().toLowerCase();
	const value = String(entry?.value ?? '').trim().toLowerCase();
	const label = String(entry?.label ?? '').trim().toLowerCase();
	return value === def || label === def;
}

/**
 * All is current only when no specific filter is applied and default is All.
 *
 * @param {{ activeFilters?: Array, defaultActive?: unknown }} args
 * @return {boolean}
 */
export function isFilterBarAllCurrent({ activeFilters, defaultActive }) {
	if (Array.isArray(activeFilters) && activeFilters.length > 0) {
		return false;
	}
	return isFilterBarDefaultAll(defaultActive);
}

/**
 * @param {{
 *   entry: { key?: string, value?: string, label?: string },
 *   activeFilters?: Array,
 *   defaultActive?: unknown,
 *   isApplied?: boolean,
 * }} args
 * @return {boolean}
 */
export function isFilterBarEntryCurrent({
	entry,
	activeFilters,
	defaultActive,
	isApplied,
}) {
	if (Array.isArray(activeFilters) && activeFilters.length > 0) {
		return !!isApplied;
	}
	return filterEntryMatchesDefaultActive(entry, defaultActive);
}

/**
 * Preview / initial chip key (`all` or `key:value`).
 *
 * @param {{
 *   availableFilters?: Array,
 *   defaultActive?: unknown,
 *   hideAllFilter?: boolean,
 * }} args
 * @return {string}
 */
export function resolveFilterBarDefaultActiveKey({
	availableFilters,
	defaultActive,
	hideAllFilter,
}) {
	const list = Array.isArray(availableFilters) ? availableFilters : [];
	if (!isFilterBarDefaultAll(defaultActive)) {
		for (let i = 0; i < list.length; i++) {
			const entry = normalizeFilterBarEntry(list[i], i);
			if (filterEntryMatchesDefaultActive(entry, defaultActive)) {
				return `${entry.key}:${entry.value ?? ''}`;
			}
		}
		const fallbackName = String(defaultActive).trim();
		if (fallbackName) {
			return `category:${fallbackName}`;
		}
	}
	if (hideAllFilter && list.length > 0) {
		const first = normalizeFilterBarEntry(list[0], 0);
		return `${first.key}:${first.value ?? ''}`;
	}
	return 'all';
}

/**
 * Options for a native filter `<select>` (All + each available filter).
 *
 * @param {Object}   args
 * @param {Array}    args.availableFilters
 * @param {boolean}  args.hideAllFilter
 * @param {string}   args.allLabel
 * @param {boolean}  [args.showFilterCount]
 * @param {Map<string, number>|Record<string, number>|null} [args.filterCounts]
 * @param {number}   [args.allCount]
 * @return {Array<{ value: string, label: string, key?: string, filterValue?: string }>}
 */
export function buildFilterSelectOptions({
	availableFilters,
	hideAllFilter,
	allLabel,
	showFilterCount = false,
	filterCounts = null,
	allCount,
}) {
	/**
	 * @param {string} name
	 * @return {number}
	 */
	const countFor = (name) => {
		if (!filterCounts) {
			return 0;
		}
		if (filterCounts instanceof Map) {
			return filterCounts.get(name) || 0;
		}
		return Number(filterCounts[name]) || 0;
	};

	/** @type {Array<{ value: string, label: string, key?: string, filterValue?: string }>} */
	const options = [];
	if (!hideAllFilter) {
		const base = allLabel || 'All';
		options.push({
			value: FILTER_SELECT_ALL_VALUE,
			label:
				showFilterCount && allCount !== undefined && allCount !== null
					? `${base} ${Number(allCount) || 0}`
					: base,
		});
	}
	(availableFilters || []).forEach((filter, index) => {
		const entry = normalizeFilterBarEntry(filter, index);
		const countKey = String(entry.value || entry.label || '');
		const count = countFor(countKey);
		options.push({
			value: entry.optionValue,
			label: showFilterCount
				? `${entry.label} ${count}`
				: entry.label,
			key: entry.key,
			filterValue: entry.value,
		});
	});
	return options;
}

/**
 * Resolve the current `<select>` value from active filters / default.
 *
 * @param {Object}   args
 * @param {Array}    args.options           From {@link buildFilterSelectOptions}
 * @param {Array}    args.activeFilters
 * @param {string}   args.defaultActive
 * @param {boolean}  args.hideAllFilter
 * @return {string}
 */
export function resolveFilterSelectValue({
	options,
	activeFilters,
	defaultActive,
	hideAllFilter,
}) {
	const list = Array.isArray(options) ? options : [];
	const active = Array.isArray(activeFilters) ? activeFilters : [];
	if (active.length > 0) {
		const current = active[0];
		const match = list.find(
			(opt) =>
				opt.value !== FILTER_SELECT_ALL_VALUE &&
				opt.key === current.key &&
				(current.value === undefined ||
					String(opt.filterValue) === String(current.value))
		);
		if (match) {
			return match.value;
		}
	}

	const def =
		typeof defaultActive === 'string' ? defaultActive.trim() : 'All';
	if (def && def.toLowerCase() !== 'all') {
		const byName = list.find(
			(opt) =>
				opt.value !== FILTER_SELECT_ALL_VALUE &&
				String(opt.filterValue || opt.label || '')
					.toLowerCase()
					.includes(def.toLowerCase())
		);
		if (byName) {
			return byName.value;
		}
	}

	if (!hideAllFilter) {
		const allOpt = list.find(
			(opt) => opt.value === FILTER_SELECT_ALL_VALUE
		);
		if (allOpt) {
			return FILTER_SELECT_ALL_VALUE;
		}
	}
	return list[0]?.value ?? FILTER_SELECT_ALL_VALUE;
}

/**
 * @param {Object} config
 * @param {Object} settings
 * @return {string}
 */
export function resolveFilterPositioning(config, settings) {
	const raw =
		settings?.filters?.filterPositioning ||
		config?.filterPositioning ||
		config?.filterPosition ||
		'top';
	return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : 'top';
}

/**
 * @return {string}
 */
export function buildFilterBarContainerClasses() {
	return 'filters';
}

/**
 * @param {string} filterPositioning
 * @return {{ before: boolean, after: boolean }}
 */
export function resolveFilterBarPlacements(filterPositioning) {
	const pos = filterPositioning || 'top';
	return {
		before: ['top', 'top_bottom', 'left', 'left_right'].includes(pos),
		after: ['bottom', 'top_bottom', 'right', 'left_right'].includes(pos),
	};
}

const FILTER_LAYOUT_SHELL_CLASS = {
	top: 'modula-gallery-filter-layout--top',
	bottom: 'modula-gallery-filter-layout--bottom',
	left: 'modula-gallery-filter-layout--left',
	right: 'modula-gallery-filter-layout--right',
	top_bottom: 'modula-gallery-filter-layout--top-bottom',
	left_right: 'modula-gallery-filter-layout--left-right',
};

/**
 * Shell around filter bars + layout (modern stack; no legacy root float classes).
 *
 * @param {string}  filterPositioning
 * @param {boolean} filtersEnabled
 * @return {string}
 */
export function resolveFilterLayoutShellClass(
	filterPositioning,
	filtersEnabled
) {
	if (!filtersEnabled) {
		return 'modula-gallery-filter-layout';
	}
	const pos = filterPositioning || 'top';
	const modifier =
		FILTER_LAYOUT_SHELL_CLASS[pos] || FILTER_LAYOUT_SHELL_CLASS.top;
	return `modula-gallery-filter-layout ${modifier}`;
}
