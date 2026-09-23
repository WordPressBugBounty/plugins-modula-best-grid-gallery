/**
 * Classic gallery Items.moveItem contract.
 *
 * Sortable / Packery `updateIndex` handlers emit a 0-based destination index.
 * After a silent remove, Backbone `Collection#add` must use that index as `{ at }`
 * (see `assets/js/admin/wp-modula-items.js` `moveItem`).
 *
 * Pure contract surface for unit tests; classic admin is a plain enqueued IIFE
 * and cannot import this module.
 * @param {Array<string|number>} ids Ordered item ids.
 * @param {number} currentIndex Index of the moved item before the move.
 * @param {number} destinationIndex 0-based drop index from updateIndex.
 * @return {Array<string|number>} New order after the move.
 */
export function reorderIdsByMove( ids, currentIndex, destinationIndex ) {
	if ( currentIndex === destinationIndex ) {
		return ids.slice();
	}
	const next = ids.slice();
	const [ id ] = next.splice( currentIndex, 1 );
	next.splice( destinationIndex, 0, id );
	return next;
}
