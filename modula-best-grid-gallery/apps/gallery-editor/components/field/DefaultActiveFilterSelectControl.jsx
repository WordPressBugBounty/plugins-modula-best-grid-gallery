/**
 * Synced select for `filters.defaultActiveFilter` vs live `filters.filters` rows.
 */

import { __, sprintf } from '@wordpress/i18n';
import { useEffect } from '@wordpress/element';
import { SelectControl } from '@wordpress/components';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { isNil } from '../../logic/isNil';

/** Prefix for select `value` rows (persisted setting stays plain name or "All"). */
const DEFAULT_ACTIVE_FILTER_ROW_PREFIX = '__mbr:';

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
		allLabel !== null &&
		allLabel !== undefined &&
		String(allLabel).trim() !== ''
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
 * @param {Object}                               props
 * @param {*}                                    props.value
 * @param {Function}                             props.onChange
 * @param {boolean}                              props.disabled
 * @param {string}                               [props.help]
 * @param {{ list: unknown, allLabel: unknown }} props.snap
 * @param {string}                               props.allFallback
 */
function DefaultActiveFilterSelectSynced({
	value,
	onChange,
	disabled,
	help,
	snap,
	allFallback,
}) {
	const opts = buildDefaultActiveFilterOptions(
		snap.list,
		snap.allLabel,
		allFallback
	);

	/* Keeps persisted field valid when filter rows are edited — must notify form (cannot derive-only). */
	useEffect(() => {
		const raw = Array.isArray(snap.list) ? snap.list : [];
		const v0 = isNil(value) || value === '' ? 'All' : String(value);
		const norm = v0.toLowerCase() === 'all' ? 'All' : v0.trim();
		if (norm === 'All') {
			return;
		}
		const names = raw.map((x) => String(x).trim()).filter((s) => s !== '');
		if (!names.includes(norm)) {
			onChange('All');
		}
	}, [snap.list, value, onChange]);

	let selectVal = selectValueFromPersistedDefaultFilter(value, snap.list);
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
		<SelectControl
			__next40pxDefaultSize
			__nextHasNoMarginBottom
			value={selectVal}
			options={
				selectOpts.length > 0
					? selectOpts
					: [
							{
								value: '',
								label: __(
									'Add a filter in the list above',
									'modula-best-grid-gallery'
								),
							},
						]
			}
			onChange={(v) =>
				onChange(persistedDefaultFilterFromSelectValue(v, snap.list))
			}
			disabled={disabled}
			help={help}
		/>
	);
}

/**
 * @param {Object}   props
 * @param {*}        props.value
 * @param {Function} props.onChange
 * @param {boolean}  props.disabled
 * @param {string}   [props.help]
 */
export default function DefaultActiveFilterSelectControl({
	value,
	onChange,
	disabled,
	help,
}) {
	const { form } = useGallerySettingsFormBundle();
	const allFallback = __('All', 'modula-best-grid-gallery');
	return (
		<form.Subscribe
			selector={(s) => {
				const list = s.values.filters?.filters;
				return {
					list,
					// Ensures Subscribe updates even if the array reference is reused.
					_listSig: Array.isArray(list)
						? list
								.map((x, i) => `${i}\u001f${String(x)}`)
								.join('\u001e')
						: '',
					allLabel: s.values.filters?.allFilterLabel,
				};
			}}
		>
			{(snap) => (
				<DefaultActiveFilterSelectSynced
					snap={snap}
					value={value}
					onChange={onChange}
					disabled={disabled}
					help={help}
					allFallback={allFallback}
				/>
			)}
		</form.Subscribe>
	);
}
