/**
 * Snapshot and merge custom-grid item cells by gallery item id.
 *
 * @package
 */

import { previewItemRowLookupKey } from 'gallery-shared/preview';

const CELL_KEYS = ['gridX', 'gridY', 'width', 'height', 'gridLocked'];

/**
 * @typedef {{
 *   gridX?: unknown,
 *   gridY?: unknown,
 *   width?: unknown,
 *   height?: unknown,
 *   gridLocked?: unknown,
 * }} CustomGridItemCell
 */

/**
 * @param {unknown} row
 * @return {string} Gallery item id, or empty when the row has none.
 */
function galleryItemIdFromRow(row) {
	const key = previewItemRowLookupKey(row);
	if (key === undefined || key === null) {
		return '';
	}
	const id = String(key).trim();
	return id;
}

/**
 * @param {Object} row
 * @return {CustomGridItemCell} Cell fields present on the row.
 */
function readCell(row) {
	/** @type {CustomGridItemCell} */
	const cell = {};
	for (const field of CELL_KEYS) {
		if (Object.prototype.hasOwnProperty.call(row, field)) {
			cell[field] = row[field];
		}
	}
	return cell;
}

/**
 * @param {unknown} catalog Preview catalog (gallery items).
 * @return {Record<string, CustomGridItemCell>} Slice keyed by gallery item id.
 */
export function snapshotCustomGridItemCells(catalog) {
	/** @type {Record<string, CustomGridItemCell>} */
	const slice = {};
	if (!Array.isArray(catalog)) {
		return slice;
	}
	for (const row of catalog) {
		const id = galleryItemIdFromRow(row);
		if (id === '' || !row || typeof row !== 'object') {
			continue;
		}
		slice[id] = readCell(row);
	}
	return slice;
}

/**
 * Best-effort merge: missing gallery item ids are skipped.
 *
 * @param {unknown} catalog Preview catalog (gallery items).
 * @param {Record<string, CustomGridItemCell>|null|undefined} slice
 * @return {Object[]} Catalog with matching cells replaced; original rows are not mutated.
 */
export function mergeCustomGridItemCells(catalog, slice) {
	const rows = Array.isArray(catalog) ? catalog : [];
	if (!slice || typeof slice !== 'object') {
		return rows.map((row) =>
			row && typeof row === 'object' ? { ...row } : row
		);
	}
	return rows.map((row) => {
		if (!row || typeof row !== 'object') {
			return row;
		}
		const id = galleryItemIdFromRow(row);
		if (id === '' || !Object.prototype.hasOwnProperty.call(slice, id)) {
			return { ...row };
		}
		const cell = slice[id];
		if (!cell || typeof cell !== 'object') {
			return { ...row };
		}
		return { ...row, ...readCell(cell) };
	});
}
