/**
 * Filter bar for the settings-editor filters preview.
 * Exactly one chip is current: All or the Selected-by-default filter.
 */
import {
	FILTER_SELECT_ALL_VALUE,
	buildFilterBarContainerClasses,
	buildFilterImageUsageCounts,
	buildFilterSelectOptions,
	buildFilteringFromSettings,
	countFilterableGalleryImages,
	isFilterBarDefaultAll,
	isFilterBarPhoneViewport,
	normalizeFilterBarEntry,
	resolveFilterBarCollapsibleActionText,
	resolveFilterBarDefaultActiveKey,
	resolveFilterSelectValue,
	shouldUseCollapsibleFilterBar,
	shouldUseFilterDropdown,
} from 'gallery-shared/preview';
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useState,
} from '@wordpress/element';
import { Select } from 'shared-ui';
import { usePreviewReduxStoreItems } from '../../../hooks/usePreviewReduxStoreItems';

/**
 * @param {string} label
 * @param {number|null|undefined} count
 * @param {boolean} showCount
 */
function FilterPreviewLabel({ label, count, showCount }) {
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
 * @param {Object} groupedSettings
 * @param {'desktop'|'tablet'|'mobile'} previewViewport
 */
export default function FiltersPreviewBar({
	groupedSettings,
	previewViewport = 'desktop',
}) {
	const filtersSettings = groupedSettings?.filters || {};
	const previewItems = usePreviewReduxStoreItems(true);
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
		() => buildFilterImageUsageCounts(previewItems),
		[previewItems]
	);
	const allCount = useMemo(
		() => countFilterableGalleryImages(previewItems),
		[previewItems]
	);

	const defaultActive = useMemo(() => {
		const raw = filtersSettings.defaultActiveFilter;
		return typeof raw === 'string' ? raw.trim() : '';
	}, [filtersSettings.defaultActiveFilter]);

	const defaultActiveKey = useMemo(
		() =>
			resolveFilterBarDefaultActiveKey({
				availableFilters,
				defaultActive,
				hideAllFilter,
			}),
		[availableFilters, defaultActive, hideAllFilter]
	);

	const [clickedKey, setClickedKey] = useState(
		/** @type {string|null} */ (null)
	);

	useEffect(() => {
		setClickedKey(null);
	}, [defaultActiveKey]);

	const currentKey = clickedKey ?? defaultActiveKey;
	const allIsCurrent =
		currentKey === 'all' &&
		(clickedKey === 'all' || isFilterBarDefaultAll(defaultActive));

	const containerClass = buildFilterBarContainerClasses();
	const listId = useId();
	const isPhone = isFilterBarPhoneViewport({}, previewViewport);
	const [collapseOpen, setCollapseOpen] = useState(false);

	const dropdownFilters = !!filtersSettings.dropdownFilters;
	const enableMobileDropdownFilters =
		!!filtersSettings.enableMobileDropdownFilters;
	const enableCollapsibleFilters = !!filtersSettings.enableCollapsibleFilters;

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

	useEffect(() => {
		if (!useCollapsible) {
			setCollapseOpen(false);
		}
	}, [useCollapsible]);

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

	const previewActiveFilters = useMemo(() => {
		if (!currentKey || currentKey === 'all') {
			return [];
		}
		const sep = currentKey.indexOf(':');
		if (sep < 0) {
			return [{ key: currentKey, value: '' }];
		}
		return [
			{
				key: currentKey.slice(0, sep),
				value: currentKey.slice(sep + 1),
			},
		];
	}, [currentKey]);

	const selectValue = useMemo(
		() =>
			resolveFilterSelectValue({
				options: selectOptions,
				activeFilters: previewActiveFilters,
				defaultActive: currentKey === 'all' ? 'All' : defaultActive,
				hideAllFilter,
			}),
		[
			selectOptions,
			previewActiveFilters,
			currentKey,
			defaultActive,
			hideAllFilter,
		]
	);

	const handleSelectChange = useCallback(
		(next) => {
			if (next === FILTER_SELECT_ALL_VALUE) {
				setClickedKey('all');
				return;
			}
			const opt = selectOptions.find((o) => o.value === next);
			if (!opt || opt.key === undefined) {
				return;
			}
			setClickedKey(`${opt.key}:${opt.filterValue ?? ''}`);
		},
		[selectOptions]
	);

	if (!availableFilters.length) {
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
				<Select
					className="modula-gallery-takeover__filters-preview-select"
					options={selectOptions}
					value={selectValue}
					onChange={handleSelectChange}
					aria-label="Gallery filters"
				/>
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
				<button
					type="button"
					data-filter="all"
					className={`modula_menu__link${
						allIsCurrent ? ' selected' : ''
					}`}
					onClick={() => setClickedKey('all')}
					aria-current={allIsCurrent ? 'true' : undefined}
				>
					<FilterPreviewLabel
						label={allLabel}
						count={allCount}
						showCount={showFilterCount}
					/>
				</button>
			</li>
		);
	}

	availableFilters.forEach((filter, index) => {
		const entry = normalizeFilterBarEntry(filter, index);
		const itemKey = `${entry.key}:${entry.value ?? ''}`;
		const selected = currentKey === itemKey && !allIsCurrent;

		menuItems.push(
			<li
				key={`${itemKey}-${index}`}
				className={`modula_menu__item${
					selected ? ' modula_menu__item--current' : ''
				}`}
			>
				<button
					type="button"
					data-filter={String(entry.value || entry.label)}
					className={`modula_menu__link${
						selected ? ' selected' : ''
					}`}
					onClick={() => setClickedKey(itemKey)}
					aria-current={selected ? 'true' : undefined}
				>
					<FilterPreviewLabel
						label={entry.label}
						count={filterCounts.get(String(entry.value || entry.label || '')) || 0}
						showCount={showFilterCount}
					/>
				</button>
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
