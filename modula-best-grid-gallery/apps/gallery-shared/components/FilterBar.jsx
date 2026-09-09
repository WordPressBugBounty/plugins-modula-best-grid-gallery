/**
 * Modula Gallery - FilterBar
 * Filter links styled via gallery chrome CSS + GalleryDynamicStyle color settings.
 * When dropdown mode is on, renders a native `<select>` of filter terms.
 * Collapse on phones hides the list behind a toggle on the phone viewport.
 *
 * @package
 */

import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useState,
} from '@wordpress/element';
import { useSelector } from 'react-redux';
import { useGalleryActions } from '../hooks/useGalleryActions';
import { useFilterBarIsPhone } from '../hooks/useFilterBarIsPhone';
import {
	buildFilterBarContainerClasses,
	buildFilterSelectOptions,
	FILTER_SELECT_ALL_VALUE,
	isFilterBarAllCurrent,
	isFilterBarEntryCurrent,
	normalizeFilterBarEntry,
	resolveFilterBarCollapsibleActionText,
	resolveFilterSelectValue,
	shouldUseCollapsibleFilterBar,
	shouldUseFilterDropdown,
} from '../utils/filterBarModel';
import {
	buildFilterImageUsageCounts,
	countFilterableGalleryImages,
} from '../utils/filterImageUsageCounts';

/**
 * @param {string} label
 * @param {number|null|undefined} count
 * @param {boolean} showCount
 */
function FilterBarLabel({ label, count, showCount }) {
	if (!showCount || count === undefined || count === null) {
		return label;
	}
	return (
		<>
			{label}{' '}
			<span className="modula_menu__count">{Number(count) || 0}</span>
		</>
	);
}

/**
 * Filter links styled via gallery chrome CSS + GalleryDynamicStyle color settings.
 */
export default function FilterBar() {
	const { availableFilters, activeFilters } = useSelector(
		(state) => state.filtering
	);
	const config = useSelector((state) => state.gallery.config || {});
	const settings = useSelector((state) => state.gallery.settings || {});
	const originalItems = useSelector(
		(state) => state.items?.originalItems || state.items?.items || []
	);
	const filtersSettings = settings.filters || {};
	const { applyFilter, removeFilter, clearFilters } = useGalleryActions();

	const containerClass = buildFilterBarContainerClasses();
	const listId = useId();
	const isPhone = useFilterBarIsPhone(config);
	const [collapseOpen, setCollapseOpen] = useState(false);

	const dropdownFilters = !!(
		filtersSettings.dropdownFilters ?? config.dropdownFilters
	);
	const enableMobileDropdownFilters = !!(
		filtersSettings.enableMobileDropdownFilters ??
		config.enableMobileDropdownFilters
	);
	const enableCollapsibleFilters = !!(
		filtersSettings.enableCollapsibleFilters ??
		config.enableCollapsibleFilters
	);

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
	const collapseLabel = resolveFilterBarCollapsibleActionText(
		filtersSettings,
		config
	);

	useEffect(() => {
		if (!useCollapsible) {
			setCollapseOpen(false);
		}
	}, [useCollapsible]);

	const hideAllFilter = !!(
		filtersSettings.hideAllFilter ?? config.hideAllFilter
	);
	const showFilterCount = !!(
		filtersSettings.showFilterCount ?? config.showFilterCount ?? true
	);
	const allLabel =
		(typeof filtersSettings.allFilterLabel === 'string' &&
		filtersSettings.allFilterLabel.trim() !== ''
			? filtersSettings.allFilterLabel.trim()
			: null) ||
		(typeof config.allFilterLabel === 'string' &&
		config.allFilterLabel.trim() !== ''
			? config.allFilterLabel.trim()
			: 'All');

	const filterCounts = useMemo(
		() => buildFilterImageUsageCounts(originalItems),
		[originalItems]
	);
	const allCount = useMemo(
		() => countFilterableGalleryImages(originalItems),
		[originalItems]
	);

	const defaultActive = useMemo(() => {
		const raw =
			filtersSettings.defaultActiveFilter ||
			config.defaultActiveFilter ||
			'All';
		return typeof raw === 'string' ? raw.trim() : 'All';
	}, [filtersSettings.defaultActiveFilter, config.defaultActiveFilter]);

	const isFilterActive = useCallback(
		(key, value) =>
			activeFilters.some(
				(f) =>
					f.key === key && (value === undefined || f.value === value)
			),
		[activeFilters]
	);

	const isAllActive = isFilterBarAllCurrent({
		activeFilters,
		defaultActive,
	});

	const handleFilterClick = useCallback(
		(event, key, value) => {
			event.preventDefault();
			if (key === 'all') {
				clearFilters();
				return;
			}
			if (isFilterActive(key, value)) {
				removeFilter(key);
				return;
			}
			clearFilters();
			applyFilter(key, value);
		},
		[applyFilter, clearFilters, isFilterActive, removeFilter]
	);

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
				defaultActive,
				hideAllFilter,
			}),
		[selectOptions, activeFilters, defaultActive, hideAllFilter]
	);

	const handleSelectChange = useCallback(
		(event) => {
			const next = event.target.value;
			if (next === FILTER_SELECT_ALL_VALUE) {
				clearFilters();
				return;
			}
			const opt = selectOptions.find((o) => o.value === next);
			if (!opt || opt.key === undefined) {
				return;
			}
			clearFilters();
			applyFilter(opt.key, opt.filterValue);
		},
		[applyFilter, clearFilters, selectOptions]
	);

	if (!availableFilters?.length) {
		return null;
	}

	const collapseToggle = useCollapsible ? (
		<button
			type="button"
			className={`filters__collapse-toggle${
				collapseOpen ? ' is-open' : ''
			}`}
			aria-expanded={collapseOpen}
			aria-controls={listId}
			onClick={() => setCollapseOpen((open) => !open)}
		>
			{collapseLabel}
		</button>
	) : null;

	const collapseClass = useCollapsible
		? ` filters--collapsible${collapseOpen ? '' : ' filters--collapsed'}`
		: '';

	if (useDropdown) {
		return (
			<div
				className={`${containerClass} filters--dropdown`}
				role="group"
				aria-label="Gallery filters"
			>
				<select
					className="filters__select"
					value={selectValue}
					onChange={handleSelectChange}
					aria-label="Gallery filters"
				>
					{selectOptions.map((opt) => (
						<option key={opt.value} value={opt.value}>
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
					isAllActive ? ' modula_menu__item--current' : ''
				}`}
			>
				<a
					href="#"
					data-filter="all"
					className={`modula_menu__link${
						isAllActive ? ' selected' : ''
					}`}
					onClick={(event) => handleFilterClick(event, 'all')}
					aria-current={isAllActive ? 'true' : undefined}
				>
					<FilterBarLabel
						label={allLabel}
						count={allCount}
						showCount={showFilterCount}
					/>
				</a>
			</li>
		);
	}

	availableFilters.forEach((filter, index) => {
		const entry = normalizeFilterBarEntry(filter, index);
		const selected = isFilterBarEntryCurrent({
			entry,
			activeFilters,
			defaultActive,
			isApplied: isFilterActive(entry.key, entry.value),
		});
		const countKey = String(entry.value || entry.label || '');
		const count = filterCounts.get(countKey) || 0;

		menuItems.push(
			<li
				key={`${entry.key}-${entry.value || ''}-${index}`}
				className={`modula_menu__item${
					selected ? ' modula_menu__item--current' : ''
				}`}
			>
				<a
					href={`#jtg-filter-${encodeURIComponent(String(entry.value || entry.label))}`}
					data-filter={String(entry.value || entry.label)}
					className={`modula_menu__link${
						selected ? ' selected' : ''
					}`}
					onClick={(event) =>
						handleFilterClick(event, entry.key, entry.value)
					}
					aria-current={selected ? 'true' : undefined}
				>
					<FilterBarLabel
						label={entry.label}
						count={count}
						showCount={showFilterCount}
					/>
				</a>
			</li>
		);
	});

	return (
		<div
			className={`${containerClass}${collapseClass}`}
			role="group"
			aria-label="Gallery filters"
		>
			{collapseToggle}
			<ul className="modula_menu__list" id={listId} role="list">
				{menuItems}
			</ul>
		</div>
	);
}
