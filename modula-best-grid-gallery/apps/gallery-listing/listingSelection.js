/**
 * Listing selection policy — type lock, select-all chooser, eligibility.
 *
 * Pure helpers for checkbox multi-select on the current listing page.
 * Product chrome (checkboxes + listing bulk bar) lives in the gallery listing app;
 * DataViews bulk footer stays hidden. Row clicks do not change selection — only
 * the checkbox column (and header select-all) may.
 */

import { __ } from '@wordpress/i18n';

/**
 * @typedef {'gallery'|'album'|'all'} ListingSelectAllChoice
 * @typedef {'gallery'|'album'|'mixed'|null} ListingSelectionMode
 */

/**
 * Whether a DOM event target is inside the listing selection checkbox column.
 *
 * DataViews toggles selection on the whole table row click; we only accept
 * changes that originated from the checkbox chrome.
 *
 * @param {EventTarget|null|undefined} target
 * @return {boolean}
 */
export function isListingSelectionCheckboxTarget(target) {
	if (!target || typeof target.closest !== 'function') {
		return false;
	}
	return Boolean(
		target.closest('.dataviews-view-table__checkbox-column') ||
			target.closest('.dataviews-selection-checkbox')
	);
}

/**
 * Stable key matching DataViews `getItemId`.
 *
 * @param {{ type?: string, id?: number }|null|undefined} item
 * @return {string|null} Item id or null.
 */
export function listingSelectionItemId(item) {
	if (!item?.type || item.id === null || item.id === undefined) {
		return null;
	}
	return `${item.type}-${item.id}`;
}

/**
 * Whether a listing row may enter listing selection.
 *
 * Live or trash gallery/album rows the admin can edit or delete.
 *
 * @param {Object|null|undefined} item
 * @return {boolean} Whether the row is selectable.
 */
export function isListingRowSelectable(item) {
	if (!item || (item.type !== 'gallery' && item.type !== 'album')) {
		return false;
	}
	return item.canEdit === true || item.canDelete === true;
}

/**
 * @param {string[]} selection
 * @param {Object[]} pageRows
 * @return {'gallery'|'album'|null} Locked type, or null when empty.
 */
export function getListingSelectionLockedType(selection, pageRows) {
	const mode = getListingSelectionMode(selection, pageRows);
	if (mode === 'gallery' || mode === 'album') {
		return mode;
	}
	return null;
}

/**
 * @param {string[]|null|undefined} selection
 * @param {Object[]|null|undefined} pageRows
 * @return {ListingSelectionMode} Selection mode.
 */
export function getListingSelectionMode(selection, pageRows) {
	if (!Array.isArray(selection) || selection.length === 0) {
		return null;
	}
	const rowsById = indexPageRows(pageRows);
	/** @type {Set<'gallery'|'album'>} */
	const types = new Set();
	for (const id of selection) {
		const row = rowsById.get(id);
		if (row?.type === 'gallery' || row?.type === 'album') {
			types.add(row.type);
		}
	}
	if (types.size === 0) {
		return null;
	}
	if (types.size > 1) {
		return 'mixed';
	}
	return types.has('album') ? 'album' : 'gallery';
}

/**
 * Chooser choices for an empty mixed page. Empty when the page is homogeneous
 * (header select-all selects that type directly).
 *
 * @param {Object[]|null|undefined} pageRows
 * @return {ListingSelectAllChoice[]} Chooser options.
 */
export function getListingSelectAllChooserOptions(pageRows) {
	const types = getSelectableListingTypes(pageRows);
	if (types.length <= 1) {
		return [];
	}
	/** @type {ListingSelectAllChoice[]} */
	const options = [...types];
	options.push('all');
	return options;
}

/**
 * @param {ListingSelectAllChoice}  choice
 * @param {Object[]|null|undefined} pageRows
 * @return {string[]} Selection ids for the choice on this page.
 */
export function selectListingRowsByChoice(choice, pageRows) {
	/** @type {string[]} */
	const ids = [];
	for (const row of Array.isArray(pageRows) ? pageRows : []) {
		if (!isListingRowSelectable(row)) {
			continue;
		}
		if (choice === 'all') {
			const id = listingSelectionItemId(row);
			if (id) {
				ids.push(id);
			}
			continue;
		}
		if (row.type === choice) {
			const id = listingSelectionItemId(row);
			if (id) {
				ids.push(id);
			}
		}
	}
	return ids;
}

/**
 * @return {string} Short notice for mixed gallery/album selection via row checks.
 */
export function getListingSelectionIncompatibleNotice() {
	return __(
		'Select galleries or albums, not both.',
		'modula-best-grid-gallery'
	);
}

/**
 * Apply a proposed selection change under listing selection row-check rules.
 *
 * Homogeneous lock: first selected type wins; incompatible adds are refused.
 * Mixed selections (from header All) may shrink without re-locking.
 *
 * @param {{
 *   currentSelection?: string[],
 *   nextSelection?: string[],
 *   pageRows?: Object[],
 * }} options
 * @return {{ selection: string[], notice: string|null }} Next selection and optional notice.
 */
export function applyListingSelectionChange({
	currentSelection = [],
	nextSelection = [],
	pageRows = [],
} = {}) {
	const current = Array.isArray(currentSelection) ? currentSelection : [];
	const next = Array.isArray(nextSelection) ? nextSelection : [];

	if (next.length === 0) {
		return { selection: [], notice: null };
	}

	const rowsById = indexPageRows(pageRows);
	/** @type {string[]} */
	const candidates = [];

	for (const id of next) {
		const row = rowsById.get(id);
		if (!isListingRowSelectable(row)) {
			continue;
		}
		candidates.push(id);
	}

	if (candidates.length === 0) {
		return { selection: [], notice: null };
	}

	const mode = getListingSelectionMode(current, pageRows);
	if (mode === 'mixed') {
		return { selection: candidates, notice: null };
	}

	const lockedType = mode;
	const preferredType =
		lockedType || rowsById.get(candidates[0])?.type || null;

	/** @type {string[]} */
	const selection = [];
	let sawIncompatible = false;
	for (const id of candidates) {
		const row = rowsById.get(id);
		if (preferredType && row?.type !== preferredType) {
			sawIncompatible = true;
			continue;
		}
		selection.push(id);
	}

	// Incompatible add alone (no new same-type ids): refuse and keep current.
	if (
		sawIncompatible &&
		lockedType &&
		selection.length === current.length &&
		selection.every((id) => current.includes(id))
	) {
		return {
			selection: current,
			notice: getListingSelectionIncompatibleNotice(),
		};
	}

	return {
		selection,
		notice: null,
	};
}

/**
 * Resolve a DataViews selection change, including header select-all.
 *
 * Non-empty + select-all proposal → clear. Empty + mixed select-all → chooser.
 * Empty + homogeneous select-all → select that type. Otherwise row-check policy.
 *
 * @param {{
 *   currentSelection?: string[],
 *   nextSelection?: string[],
 *   pageRows?: Object[],
 * }} options
 * @return {{ selection: string[], notice: string|null, chooserOptions: ListingSelectAllChoice[]|null }} Resolved selection change.
 */
export function resolveListingSelectionChange({
	currentSelection = [],
	nextSelection = [],
	pageRows = [],
} = {}) {
	const current = Array.isArray(currentSelection) ? currentSelection : [];
	const next = Array.isArray(nextSelection) ? nextSelection : [];

	if (next.length === 0) {
		return { selection: [], notice: null, chooserOptions: null };
	}

	const selectAllProposal = isListingSelectAllProposal(next, pageRows);

	if (current.length > 0 && selectAllProposal) {
		return { selection: [], notice: null, chooserOptions: null };
	}

	if (current.length === 0 && selectAllProposal) {
		const chooserOptions = getListingSelectAllChooserOptions(pageRows);
		if (chooserOptions.length > 0) {
			return {
				selection: [],
				notice: null,
				chooserOptions,
			};
		}
		const types = getSelectableListingTypes(pageRows);
		const only = types[0] || null;
		if (!only) {
			return { selection: [], notice: null, chooserOptions: null };
		}
		return {
			selection: selectListingRowsByChoice(only, pageRows),
			notice: null,
			chooserOptions: null,
		};
	}

	const rowResult = applyListingSelectionChange({
		currentSelection: current,
		nextSelection: next,
		pageRows,
	});
	return {
		selection: rowResult.selection,
		notice: rowResult.notice,
		chooserOptions: null,
	};
}

/**
 * DataViews bulk action that only enables the checkbox column.
 * Product bulk UI is the listing bulk bar (ticket 02+); footer stays hidden.
 *
 * @return {Object[]} DataViews actions with supportsBulk.
 */
export function getListingSelectionBulkActions() {
	return [
		{
			id: 'listing-selection',
			label: __('Select', 'modula-best-grid-gallery'),
			supportsBulk: true,
			isEligible: (item) => isListingRowSelectable(item),
			callback: () => {},
		},
	];
}

/**
 * @param {Object[]|null|undefined} pageRows
 * @return {('gallery'|'album')[]} Selectable types present on the page.
 */
function getSelectableListingTypes(pageRows) {
	/** @type {Set<'gallery'|'album'>} */
	const types = new Set();
	for (const row of Array.isArray(pageRows) ? pageRows : []) {
		if (!isListingRowSelectable(row)) {
			continue;
		}
		if (row.type === 'gallery' || row.type === 'album') {
			types.add(row.type);
		}
	}
	/** @type {('gallery'|'album')[]} */
	const ordered = [];
	if (types.has('gallery')) {
		ordered.push('gallery');
	}
	if (types.has('album')) {
		ordered.push('album');
	}
	return ordered;
}

/**
 * True when nextSelection covers every selectable row on the page (header select-all).
 *
 * @param {string[]}                nextSelection
 * @param {Object[]|null|undefined} pageRows
 * @return {boolean} Whether nextSelection is a select-all proposal.
 */
function isListingSelectAllProposal(nextSelection, pageRows) {
	const selectable = selectListingRowsByChoice('all', pageRows);
	if (selectable.length === 0) {
		return false;
	}
	const nextSet = new Set(nextSelection);
	return selectable.every((id) => nextSet.has(id));
}

/**
 * @param {Object[]|null|undefined} pageRows
 * @return {Map<string, Object>} Rows keyed by listing selection id.
 */
function indexPageRows(pageRows) {
	/** @type {Map<string, Object>} */
	const map = new Map();
	for (const row of Array.isArray(pageRows) ? pageRows : []) {
		const id = listingSelectionItemId(row);
		if (id) {
			map.set(id, row);
		}
	}
	return map;
}
