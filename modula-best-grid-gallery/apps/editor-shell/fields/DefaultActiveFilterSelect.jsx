/**
 * The filter selected when the page loads (`filters.defaultActiveFilter`): a
 * menu select of "All" and the rows of the live filter list, in the gallery
 * editor and the Albums editor. When the chosen name leaves the list, the
 * setting goes back to "All". Each editor reads the list and the All label
 * from its form and renders the help line.
 */

import { __, sprintf } from '@wordpress/i18n';
import { useEffect } from '@wordpress/element';
import SelectMenuControl from './SelectMenuControl';

/** Prefix for select `value` rows (persisted setting stays plain name or "All"). */
const DEFAULT_ACTIVE_FILTER_ROW_PREFIX = '__mbr:';

/**
 * @param {unknown} value
 * @return {boolean} Whether the value is null or undefined.
 */
function isNil(value) {
	return value === null || value === undefined;
}

/**
 * Options for filters.defaultActiveFilter: always includes "All", then one row per non-empty filter line.
 *
 * @param {unknown} filtersArr       filters.filters
 * @param {unknown} allLabel         filters.allFilterLabel
 * @param {string}  allFallbackLabel Display for the aggregate "All" control (WP i18n).
 * @return {{ value: string, label: string }[]} Select options including "All" and one entry per filter row.
 */
function buildDefaultActiveFilterOptions(
	filtersArr,
	allLabel,
	allFallbackLabel
) {
	const raw = Array.isArray(filtersArr) ? filtersArr : [];
	const labelAll =
		!isNil(allLabel) && String(allLabel).trim() !== ''
			? String(allLabel).trim()
			: allFallbackLabel;
	/** @type {{ value: string, label: string }[]} */
	const opts = [{ value: 'All', label: labelAll }];

	const nameTotals = /** @type {Map<string, number>} */ (new Map());
	for (const f of raw) {
		const s = String(f).trim();
		if (!s) {
			continue;
		}
		nameTotals.set(s, (nameTotals.get(s) ?? 0) + 1);
	}
	const seen = /** @type {Map<string, number>} */ (new Map());

	for (let i = 0; i < raw.length; i++) {
		const s = String(raw[i]).trim();
		if (!s) {
			continue;
		}
		const total = nameTotals.get(s) ?? 1;
		const occ = (seen.get(s) ?? 0) + 1;
		seen.set(s, occ);
		const label =
			total > 1
				? sprintf(
						/* translators: 1: filter name, 2: row occurrence when duplicate names exist */
						__('%1$s (row %2$d)', 'modula-best-grid-gallery'),
						s,
						occ
					)
				: s;
		opts.push({
			value: `${DEFAULT_ACTIVE_FILTER_ROW_PREFIX}${i}`,
			label,
		});
	}
	return opts;
}

/**
 * @param {string}  selectValue Value from SelectControl (includes row prefix or "All").
 * @param {unknown} filtersArr
 * @return {string} Persisted `filters.defaultActiveFilter` ("All" or trimmed filter name).
 */
function persistedDefaultFilterFromSelectValue(selectValue, filtersArr) {
	if (selectValue === 'All' || String(selectValue).toLowerCase() === 'all') {
		return 'All';
	}
	const raw = Array.isArray(filtersArr) ? filtersArr : [];
	const m = String(selectValue).match(
		new RegExp(`^${DEFAULT_ACTIVE_FILTER_ROW_PREFIX}(\\d+)$`)
	);
	if (m) {
		const idx = parseInt(m[1], 10);
		const cell = raw[idx];
		if (cell !== undefined && cell !== null) {
			return String(cell).trim();
		}
		return '';
	}
	return String(selectValue).trim();
}

/**
 * @param {*}       persisted  Form value ("All" or filter name).
 * @param {unknown} filtersArr
 * @return {string} SelectControl `value` (All or row-prefixed id).
 */
function selectValueFromPersistedDefaultFilter(persisted, filtersArr) {
	const raw = Array.isArray(filtersArr) ? filtersArr : [];
	const p = isNil(persisted) || persisted === '' ? 'All' : String(persisted);
	if (p.toLowerCase() === 'all') {
		return 'All';
	}
	for (let i = 0; i < raw.length; i++) {
		if (String(raw[i]).trim() === p) {
			return `${DEFAULT_ACTIVE_FILTER_ROW_PREFIX}${i}`;
		}
	}
	return p;
}

/**
 * Keeps `filters.defaultActiveFilter` consistent when the chosen name no longer exists in any row.
 *
 * @param {Object}   props
 * @param {string}   [props.id]
 * @param {string}   props.label         Setting name; names the menu.
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string}   [props.describedBy] Id of the help line under the menu.
 * @param {unknown}  props.list          `filters.filters`
 * @param {unknown}  props.allLabel      `filters.allFilterLabel`
 * @param {string}   [props.classBlock]  The editor's class block (`SelectMenuControl`).
 */
export default function DefaultActiveFilterSelect({
	id,
	label,
	value,
	onChange,
	disabled,
	describedBy,
	list,
	allLabel,
	classBlock,
}) {
	const opts = buildDefaultActiveFilterOptions(
		list,
		allLabel,
		__('All', 'modula-best-grid-gallery')
	);

	/* Keeps persisted field valid when filter rows are edited — must notify form (cannot derive-only). */
	useEffect(() => {
		const raw = Array.isArray(list) ? list : [];
		const v0 = isNil(value) || value === '' ? 'All' : String(value);
		const norm = v0.toLowerCase() === 'all' ? 'All' : v0.trim();
		if (norm === 'All') {
			return;
		}
		const names = raw.map((x) => String(x).trim()).filter((s) => s !== '');
		if (!names.includes(norm)) {
			onChange('All');
		}
	}, [list, value, onChange]);

	let selectVal = selectValueFromPersistedDefaultFilter(value, list);
	if (!opts.some((o) => o.value === selectVal)) {
		selectVal =
			isNil(value) ||
			value === '' ||
			String(value).toLowerCase() === 'all'
				? 'All'
				: String(value);
	}
	const selectOpts =
		selectVal &&
		selectVal !== 'All' &&
		!opts.some((o) => o.value === selectVal)
			? [...opts, { value: selectVal, label: selectVal }]
			: opts;

	return (
		<SelectMenuControl
			classBlock={classBlock}
			id={id}
			label={label}
			value={selectVal}
			groups={[{ id: 'default', options: selectOpts }]}
			placeholder={__(
				'Add a filter in the list above',
				'modula-best-grid-gallery'
			)}
			onChange={(v) =>
				onChange(persistedDefaultFilterFromSelectValue(v, list))
			}
			disabled={disabled}
			describedBy={describedBy}
		/>
	);
}
