/**
 * An item removed from the gallery, as an editor history change: Undo puts
 * the row back at its position in the catalog, Redo takes it out again.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
	isVideoGalleryItem,
	previewItemRowLookupKey,
} from 'gallery-shared/preview';

/**
 * @typedef {{ kind: 'remove', coreIndex: number, row: Object }} ItemRemovalChange
 * @typedef {{ direction: 'undo'|'redo', change: ItemRemovalChange }} ItemRemovalOp
 * @typedef {{ stepLabel: string, removedMessage: string, restoredMessage: string }} RemovedItemCopy
 */

/** @type {Record<string, () => RemovedItemCopy>} */
const REMOVED_ITEM_COPY = {
	image: () => ({
		stepLabel: __('Remove image', 'modula-best-grid-gallery'),
		removedMessage: __('Image removed', 'modula-best-grid-gallery'),
		restoredMessage: __('Image restored', 'modula-best-grid-gallery'),
	}),
	video: () => ({
		stepLabel: __('Remove video', 'modula-best-grid-gallery'),
		removedMessage: __('Video removed', 'modula-best-grid-gallery'),
		restoredMessage: __('Video restored', 'modula-best-grid-gallery'),
	}),
	'content-block': () => ({
		stepLabel: __('Remove content block', 'modula-best-grid-gallery'),
		removedMessage: __('Content block removed', 'modula-best-grid-gallery'),
		restoredMessage: __(
			'Content block restored',
			'modula-best-grid-gallery'
		),
	}),
	item: () => ({
		stepLabel: __('Remove item', 'modula-best-grid-gallery'),
		removedMessage: __('Item removed', 'modula-best-grid-gallery'),
		restoredMessage: __('Item restored', 'modula-best-grid-gallery'),
	}),
};

/**
 * @param {Object} row
 * @return {'image'|'video'|'content-block'|'item'} Copy key for the row.
 */
function removedItemKind(row) {
	if (isContentBlockGalleryItemRow(row)) {
		return 'content-block';
	}
	if (isEmbeddedGalleryItemRow(row)) {
		return 'item';
	}
	if (isVideoGalleryItem(row)) {
		return 'video';
	}
	return 'image';
}

/**
 * History label and toast messages for a removed row.
 *
 * @param {Object} row
 * @return {RemovedItemCopy} Copy for the row's kind.
 */
export function describeRemovedItem(row) {
	return REMOVED_ITEM_COPY[removedItemKind(row)]();
}

/**
 * @param {Object[]} coreItems Catalog before the removal.
 * @param {number}   coreIndex Position of the removed row.
 * @return {ItemRemovalChange|null} Null when the position holds no row.
 */
export function buildItemRemovalChange(coreItems, coreIndex) {
	const row = Array.isArray(coreItems) ? coreItems[coreIndex] : undefined;
	if (!Number.isInteger(coreIndex) || !row || typeof row !== 'object') {
		return null;
	}
	return { kind: 'remove', coreIndex, row: { ...row } };
}

/**
 * Where the removed row is now: its old position when it is still there,
 * else the first row with its identity.
 *
 * @param {Object[]}          coreItems
 * @param {ItemRemovalChange} change
 * @return {number} Index, or -1.
 */
function findRemovedRowIndex(coreItems, change) {
	const key = String(previewItemRowLookupKey(change.row) ?? '');
	const sameRow = (row) => String(previewItemRowLookupKey(row) ?? '') === key;
	if (sameRow(coreItems[change.coreIndex])) {
		return change.coreIndex;
	}
	return coreItems.findIndex(sameRow);
}

/**
 * @param {Object[]}      coreItems Current catalog.
 * @param {ItemRemovalOp} op
 * @return {Object[]|null} Next catalog, or null when there is nothing to apply.
 */
export function applyItemRemovalOp(coreItems, op) {
	const change = op?.change;
	const isKnownDirection =
		op?.direction === 'undo' || op?.direction === 'redo';
	if (
		change?.kind !== 'remove' ||
		!isKnownDirection ||
		!Array.isArray(coreItems)
	) {
		return null;
	}
	const next = [...coreItems];
	if (op.direction === 'undo') {
		next.splice(Math.min(change.coreIndex, next.length), 0, {
			...change.row,
		});
		return next;
	}
	const index = findRemovedRowIndex(next, change);
	if (index < 0) {
		return null;
	}
	next.splice(index, 1);
	return next;
}
