/**
 * Images added to the gallery or replacing one of its images, as catalog
 * changes and editor history changes (ADR 0059: both are unsaved changes the
 * editor save stores). The items come from the item-rows route, so the server
 * built them; nothing here builds a row.
 *
 * @package
 */

import {
	isEmbeddedGalleryItemRow,
	previewItemRowLookupKey,
} from 'gallery-shared/preview';

/**
 * @typedef {{ kind: 'add', coreIndex: number, rows: Object[] }} ItemAddChange
 * @typedef {{ coreIndex: number, before: Object, after: Object }} ItemReplacement
 * @typedef {{ kind: 'replace', replacements: ItemReplacement[] }} ItemReplaceChange
 * @typedef {{ direction: 'undo'|'redo', change: ItemAddChange|ItemReplaceChange }} ItemAddReplaceOp
 */

/**
 * @param {Object} row
 * @return {number} Attachment id of an image row, 0 for anything else.
 */
function attachmentIdOf(row) {
	if (!row || typeof row !== 'object' || isEmbeddedGalleryItemRow(row)) {
		return 0;
	}
	const id = Number(row.id);
	return Number.isInteger(id) && id > 0 ? id : 0;
}

/**
 * @param {Object} row
 * @return {string} History identity of a row.
 */
function rowKey(row) {
	return String(previewItemRowLookupKey(row) ?? '');
}

/**
 * Where a row recorded by a change is now: its recorded position when it is
 * still there, else the first row with its identity.
 *
 * @param {Object[]} coreItems
 * @param {Object}   row
 * @param {number}   coreIndex
 * @return {number} Index, or -1.
 */
function findRowIndex(coreItems, row, coreIndex) {
	const key = rowKey(row);
	if (rowKey(coreItems[coreIndex]) === key) {
		return coreIndex;
	}
	return coreItems.findIndex((candidate) => rowKey(candidate) === key);
}

/**
 * Add built items at the insert position. Images already in the gallery are
 * skipped, as the stored `add-images` path skipped them.
 *
 * @param {Object[]}      coreItems Current catalog.
 * @param {Object[]}      items     Items from the item-rows route, in order.
 * @param {'start'|'end'} position  Insert position ("New images go to the…").
 * @return {{ catalog: Object[], change: ItemAddChange }|null} Null when nothing is new.
 */
export function insertAddedItems(coreItems, items, position) {
	return insertNewRows(
		coreItems,
		items.filter((item) => attachmentIdOf(item) > 0),
		position
	);
}

/**
 * Add rows an extension built (a video row, an imported image) at the insert
 * position. Rows without an attachment (video templates) are all new; an image
 * already in the gallery is skipped, as for an added attachment.
 *
 * @param {Object[]}      coreItems Current catalog.
 * @param {Object[]}      items     Built rows, in order.
 * @param {'start'|'end'} position  Insert position.
 * @return {{ catalog: Object[], change: ItemAddChange }|null} Null when nothing is new.
 */
export function insertBuiltItems(coreItems, items, position) {
	return insertNewRows(
		coreItems,
		items.filter((item) => item && typeof item === 'object'),
		position
	);
}

/**
 * @param {Object[]}      coreItems
 * @param {Object[]}      items     Candidate rows.
 * @param {'start'|'end'} position
 * @return {{ catalog: Object[], change: ItemAddChange }|null} Null when nothing is new.
 */
function insertNewRows(coreItems, items, position) {
	const present = new Set(coreItems.map(attachmentIdOf).filter(Boolean));
	const rows = [];
	for (const item of items) {
		const id = attachmentIdOf(item);
		if (id && present.has(id)) {
			continue;
		}
		if (id) {
			present.add(id);
		}
		rows.push(item);
	}
	if (rows.length === 0) {
		return null;
	}
	const coreIndex = position === 'start' ? 0 : coreItems.length;
	const catalog = [...coreItems];
	catalog.splice(coreIndex, 0, ...rows);
	return { catalog, change: { kind: 'add', coreIndex, rows } };
}

/**
 * Put new rows at existing positions.
 *
 * @param {Object[]}                             coreItems    Current catalog.
 * @param {{ coreIndex: number, row: Object }[]} replacements New row per position.
 * @return {{ catalog: Object[], change: ItemReplaceChange }|null} Null when no position holds a row.
 */
export function replaceItemsInCatalog(coreItems, replacements) {
	const catalog = [...coreItems];
	const applied = [];
	for (const { coreIndex, row } of replacements) {
		const before = catalog[coreIndex];
		if (!Number.isInteger(coreIndex) || !before || !row) {
			continue;
		}
		catalog[coreIndex] = row;
		applied.push({ coreIndex, before, after: row });
	}
	if (applied.length === 0) {
		return null;
	}
	return { catalog, change: { kind: 'replace', replacements: applied } };
}

/**
 * @param {Object[]}         coreItems
 * @param {ItemAddReplaceOp} op
 * @return {Object[]|null} Next catalog, or null when there is nothing to apply.
 */
export function applyItemAddOp(coreItems, op) {
	const { change } = op;
	const next = [...coreItems];
	if (op.direction === 'redo') {
		next.splice(Math.min(change.coreIndex, next.length), 0, ...change.rows);
		return next;
	}
	// Last first, so the recorded positions of the earlier rows still hold.
	let removed = 0;
	for (let i = change.rows.length - 1; i >= 0; i--) {
		const index = findRowIndex(next, change.rows[i], change.coreIndex + i);
		if (index >= 0) {
			next.splice(index, 1);
			removed += 1;
		}
	}
	return removed > 0 ? next : null;
}

/**
 * @param {Object[]}         coreItems
 * @param {ItemAddReplaceOp} op
 * @return {Object[]|null} Next catalog, or null when there is nothing to apply.
 */
export function applyItemReplaceOp(coreItems, op) {
	const isUndo = op.direction === 'undo';
	const next = [...coreItems];
	let applied = 0;
	for (const { coreIndex, before, after } of op.change.replacements) {
		const from = isUndo ? after : before;
		const index = findRowIndex(next, from, coreIndex);
		if (index >= 0) {
			next[index] = isUndo ? before : after;
			applied += 1;
		}
	}
	return applied > 0 ? next : null;
}
