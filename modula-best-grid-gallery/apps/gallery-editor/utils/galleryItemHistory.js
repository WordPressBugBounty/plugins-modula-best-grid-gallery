/**
 * Editor history steps that change the gallery's items: one applier per
 * change kind (removal, addition, replacement, Restore of a recovery copy).
 *
 * @package
 */

import { applyItemAddOp, applyItemReplaceOp } from './galleryItemAddReplace';
import { applyItemRemovalOp } from './galleryItemRemovalHistory';
import { applyItemRestoreOp } from './galleryItemsRecovery';

/** @type {Record<string, (coreItems: Object[], op: Object) => Object[]|null>} */
const ITEM_HISTORY_APPLIERS = {
	remove: applyItemRemovalOp,
	add: applyItemAddOp,
	replace: applyItemReplaceOp,
	restore: applyItemRestoreOp,
};

/**
 * @param {Object[]}                                                          coreItems Current catalog.
 * @param {{ direction: 'undo'|'redo', change: { kind?: string }|undefined }} op
 * @return {Object[]|null} Next catalog, or null when there is nothing to apply.
 */
export function applyGalleryItemHistoryOp(coreItems, op) {
	const isKnownDirection =
		op?.direction === 'undo' || op?.direction === 'redo';
	const apply = Object.prototype.hasOwnProperty.call(
		ITEM_HISTORY_APPLIERS,
		op?.change?.kind
	)
		? ITEM_HISTORY_APPLIERS[op.change.kind]
		: null;
	if (!apply || !isKnownDirection || !Array.isArray(coreItems)) {
		return null;
	}
	return apply(coreItems, op);
}
