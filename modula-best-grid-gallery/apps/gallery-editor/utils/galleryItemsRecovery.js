/**
 * The gallery items in the editor's recovery copy (ADR 0059, explicit-save
 * ticket 07): the working catalog as the preview store holds it (rows added
 * through the item-rows route included, though never stored) and the sort
 * mode. Restore puts the catalog back as one history step, so Undo returns to
 * the catalog the editor opened with.
 *
 * @package
 */

import { isEmbeddedGalleryItemRow } from 'gallery-shared/preview';
import { isGallerySortMode } from './gallerySortingApply';
import { isVideoTemplateRow } from './videoTemplateItems';

/**
 * @typedef {Object} GalleryItemsRecoverySnapshot
 * @property {Object[]} catalog     Preview catalog (gallery items, display order).
 * @property {string}   sortingMode Working sort mode.
 */

/**
 * @typedef {Object} ItemRestoreChange
 * @property {'restore'} kind   The history change kind.
 * @property {Object[]}  before Catalog before Restore.
 * @property {Object[]}  after  Restored catalog.
 */

/**
 * A catalog row has an item identity the gallery can store: a content block
 * or shortcode, a video template row, or an attachment (a positive integer id).
 *
 * @param {unknown} row A row from the recovery copy.
 * @return {boolean} Whether the row is a well-formed gallery item.
 */
function isRecoverableItemRow(row) {
	if (!row || typeof row !== 'object' || Array.isArray(row)) {
		return false;
	}
	if (isEmbeddedGalleryItemRow(row) || isVideoTemplateRow(row)) {
		return true;
	}
	const id = Number(row.id);
	return Number.isInteger(id) && id > 0;
}

/**
 * The copy comes from browser storage: it is used only when every row is a
 * well-formed item and the sort mode is one the editor knows; otherwise
 * Restore changes nothing.
 *
 * @param {unknown} snapshot The items' state as the recovery copy holds it.
 * @return {GalleryItemsRecoverySnapshot|null} The snapshot, or null when it cannot be used.
 */
export function readItemsRecoverySnapshot(snapshot) {
	const catalog = snapshot?.catalog;
	const isUsable =
		Array.isArray(catalog) &&
		catalog.every(isRecoverableItemRow) &&
		isGallerySortMode(snapshot.sortingMode);
	return isUsable ? { catalog, sortingMode: snapshot.sortingMode } : null;
}

/**
 * @param {Object[]} before Catalog before Restore.
 * @param {Object[]} after  Restored catalog.
 * @return {ItemRestoreChange} The history change of a Restore.
 */
export function buildItemRestoreChange(before, after) {
	return { kind: 'restore', before, after };
}

/**
 * Undo puts the catalog from before Restore back; redo the restored one.
 *
 * @param {Object[]}                                                coreItems Current catalog (unused: Restore replaced the whole catalog).
 * @param {{ direction: 'undo'|'redo', change: ItemRestoreChange }} op
 * @return {Object[]|null} Next catalog, or null when the change is unusable.
 */
export function applyItemRestoreOp(coreItems, op) {
	const next = op.direction === 'undo' ? op.change.before : op.change.after;
	return Array.isArray(next) ? next.map((row) => ({ ...row })) : null;
}
