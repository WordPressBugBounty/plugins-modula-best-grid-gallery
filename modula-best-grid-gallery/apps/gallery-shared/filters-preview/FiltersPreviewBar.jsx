/**
 * Filter bar for the settings-editor filters preview, shared by the gallery
 * editor and the Albums editor. A preview only, with no function in the
 * editor (maintainer, 2026-10-25, Lite ticket 85): nothing in it can be
 * clicked or focused. It opens as the visitor's bar does (Lite ticket 87):
 * the current chip and dropdown option follow the filters the visitor starts
 * with, and a collapsible bar stays closed.
 *
 * @package
 */
import {
	buildFilterBarContainerClasses,
	buildFilterSelectOptions,
	buildFilteringFromSettings,
	isFilterBarAllCurrent,
	isFilterBarEntryCurrent,
	isFilterBarFilterApplied,
	isFilterBarPhoneViewport,
	normalizeFilterBarEntry,
	resolveFilterBarCollapsibleActionText,
	resolveFilterBarInitialActiveFilters,
	resolveFilterSelectValue,
	shouldShowFilterSelectPlaceholder,
	shouldUseCollapsibleFilterBar,
	shouldUseFilterDropdown,
} from '../utils/filterBarModel';
import {
	buildFilterImageUsageCounts,
	countFilterableGalleryImages,
	formatFilterCountToken,
} from '../utils/filterImageUsageCounts';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/** The static bar's root, beside the visitor's `filters` class. */
export const FILTERS_PREVIEW_BAR_CLASS =
	'modula-gallery-takeover__filters-preview-bar';

/**
 * @param {{
 *   label: string,
 *   count: number|null|undefined,
 *   showCount: boolean,
 * }} props
 */
function FilterPreviewLabel({ label, count, showCount }) {
	if (!showCount || count === undefined || count === null) {
		return label;
	}
	return (
		<>
			{label}{' '}
			<span className="modula_menu__count">
				{formatFilterCountToken(count)}
			</span>
		</>
	);
}

/**
 * `items` are the rows the chips count (gallery images, album members);
 * `style` holds the root's custom properties on the canvas
 * (`canvasFiltersPreviewBarStyle`).
 *
 * @param {{
 *   groupedSettings: Object,
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   items: Object[],
 *   ariaLabel?: string,
 *   style?: Object,
 * }} props
 */
export default function FiltersPreviewBar({
	groupedSettings,
	previewViewport = 'desktop',
	items,
	ariaLabel = 'Gallery filters',
	style,
}) {
	const filtersSettings = groupedSettings?.filters || {};
	const { availableFilters } = useMemo(
		() => buildFilteringFromSettings(groupedSettings),
		[groupedSettings]
	);

	const hideAllFilter = !!filtersSettings.hideAllFilter;
	const showFilterCount = filtersSettings.showFilterCount !== false;
	const allLabel =
		typeof filtersSettings.allFilterLabel === 'string' &&
		filtersSettings.allFilterLabel.trim() !== ''
			? filtersSettings.allFilterLabel.trim()
			: 'All';

	const filterCounts = useMemo(
		() => buildFilterImageUsageCounts(items),
		[items]
	);
	const allCount = useMemo(
		() => countFilterableGalleryImages(items),
		[items]
	);

	const activeFilters = useMemo(
		() =>
			resolveFilterBarInitialActiveFilters({
				availableFilters,
				defaultActive: filtersSettings.defaultActiveFilter,
			}),
		[availableFilters, filtersSettings.defaultActiveFilter]
	);

	const dropdownFilters = !!filtersSettings.dropdownFilters;
	const enableMobileDropdownFilters =
		!!filtersSettings.enableMobileDropdownFilters;
	const enableCollapsibleFilters = !!filtersSettings.enableCollapsibleFilters;

	const selectOptions = useMemo(
		() =>
			buildFilterSelectOptions({
				availableFilters,
				hideAllFilter,
				allLabel,
				showFilterCount,
				filterCounts,
				allCount,
			}),
		[
			availableFilters,
			hideAllFilter,
			allLabel,
			showFilterCount,
			filterCounts,
			allCount,
		]
	);

	const selectValue = useMemo(
		() =>
			resolveFilterSelectValue({
				options: selectOptions,
				activeFilters,
				hideAllFilter,
			}),
		[selectOptions, activeFilters, hideAllFilter]
	);

	if (!availableFilters.length) {
		return null;
	}

	const allIsCurrent = isFilterBarAllCurrent({ activeFilters });
	const isPhone = isFilterBarPhoneViewport({}, previewViewport);
	// The marker class carries the static look wherever the bar is drawn: the
	// Filters tab and the canvas (Lite ticket 96).
	const containerClass = `${buildFilterBarContainerClasses()} ${FILTERS_PREVIEW_BAR_CLASS}`;
	const useDropdown = shouldUseFilterDropdown({
		dropdownFilters,
		enableMobileDropdownFilters,
		isPhone,
	});
	const useCollapsible = shouldUseCollapsibleFilterBar({
		enableCollapsibleFilters,
		dropdownFilters,
		enableMobileDropdownFilters,
		isPhone,
	});
	const collapseLabel =
		resolveFilterBarCollapsibleActionText(filtersSettings);

	// A disabled button, not a span: the visitor's `.filters button` chrome
	// draws the toggle's frame.
	const collapseToggle = useCollapsible ? (
		<button type="button" className="filters__collapse-toggle" disabled>
			{collapseLabel}
		</button>
	) : null;

	const collapseClass = useCollapsible
		? ' filters--collapsible filters--collapsed'
		: '';

	if (useDropdown) {
		const hasUnfilteredPlaceholder = shouldShowFilterSelectPlaceholder({
			hideAllFilter,
			activeFilters,
		});
		return (
			<div
				className={`${containerClass} filters--dropdown`}
				style={style}
				role="group"
				aria-label={ariaLabel}
			>
				{/* The visitor's native dropdown (gallery-shared FilterBar), so the
				    artboard shows what the frontend renders. Disabled, as the
				    preview filters nothing; styled as the enabled one. */}
				<select
					className="filters__select modula-gallery-takeover__filters-preview-select"
					value={hasUnfilteredPlaceholder ? '' : selectValue}
					disabled
					aria-label={ariaLabel}
				>
					{hasUnfilteredPlaceholder && (
						<option value="" disabled>
							{__('Select a filter', 'modula-best-grid-gallery')}
						</option>
					)}
					{selectOptions.map((opt) => (
						<option
							key={String(opt.value)}
							value={String(opt.value)}
							disabled={Boolean(opt.disabled)}
						>
							{opt.label}
						</option>
					))}
				</select>
			</div>
		);
	}

	const menuItems = [];

	if (!hideAllFilter) {
		menuItems.push(
			<li
				key="filter-all"
				className={`modula_menu__item${
					allIsCurrent ? ' modula_menu__item--current' : ''
				}`}
			>
				<span
					data-filter="all"
					className={`modula_menu__link${
						allIsCurrent ? ' selected' : ''
					}`}
					aria-current={allIsCurrent ? 'true' : undefined}
				>
					<FilterPreviewLabel
						label={allLabel}
						count={allCount}
						showCount={showFilterCount}
					/>
				</span>
			</li>
		);
	}

	availableFilters.forEach((filter, index) => {
		const entry = normalizeFilterBarEntry(filter, index);
		const itemKey = `${entry.key}:${entry.value ?? ''}`;
		const selected = isFilterBarEntryCurrent({
			entry,
			activeFilters,
			isApplied: isFilterBarFilterApplied(
				activeFilters,
				entry.key,
				entry.value
			),
		});

		menuItems.push(
			<li
				key={`${itemKey}-${index}`}
				className={`modula_menu__item${
					selected ? ' modula_menu__item--current' : ''
				}`}
			>
				<span
					data-filter={String(entry.value || entry.label)}
					className={`modula_menu__link${
						selected ? ' selected' : ''
					}`}
					aria-current={selected ? 'true' : undefined}
				>
					<FilterPreviewLabel
						label={entry.label}
						count={
							filterCounts.get(
								String(entry.value || entry.label || '')
							) || 0
						}
						showCount={showFilterCount}
					/>
				</span>
			</li>
		);
	});

	return (
		<div
			className={`${containerClass}${collapseClass}`}
			style={style}
			role="group"
			aria-label={ariaLabel}
		>
			{collapseToggle}
			{/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops the list role of a list-style: none list; the visitor's bar keeps it too. */}
			<ul className="modula_menu__list" role="list">
				{menuItems}
			</ul>
		</div>
	);
}
