/**
 * The open item's place ("Image 3 of 12") and its previous/next items for
 * `ItemEditPanelHeader`, in canvas order. Previous and next wrap around, as
 * on the canvas.
 */

/**
 * @template T
 * @typedef {Object} ItemEditPager
 * @property {number} position 1-based place of the open item.
 * @property {number} total    Items the panel pages over.
 * @property {T|null} previous Wraps to the last item; null when the item is alone.
 * @property {T|null} next     Wraps to the first item; null when the item is alone.
 */

/**
 * @template T
 * @param {T[]} items Item keys in canvas order.
 * @param {T}   open  Key of the item open in the panel.
 * @return {ItemEditPager<T>|null} Null when `open` is not among `items`.
 */
export function getItemEditPager(items, open) {
	const at = items.indexOf(open);
	if (at < 0) {
		return null;
	}
	const total = items.length;
	const hasNeighbours = total > 1;
	return {
		position: at + 1,
		total,
		previous: hasNeighbours ? items[(at - 1 + total) % total] : null,
		next: hasNeighbours ? items[(at + 1) % total] : null,
	};
}
