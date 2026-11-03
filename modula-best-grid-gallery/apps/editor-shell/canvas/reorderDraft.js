/**
 * The Reorder dialog's draft order (`CanvasReorderDialog`): item keys in the
 * order the user is building, before Save order writes it. Each change
 * returns a new array, or the same one when nothing moves.
 */
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Keeps the draft while the document holds the same items; once an item
 * comes or goes, the draft restarts from the document's order.
 *
 * @param {string[]} draft    Draft keys.
 * @param {string[]} document Keys in the document's order.
 * @return {string[]} `draft`, or `document` when the item set changed.
 */
export function reconcileReorderKeys(draft, document) {
	const sameItems =
		draft.length === document.length &&
		draft.length > 0 &&
		draft.every((k) => document.includes(k)) &&
		document.every((k) => draft.includes(k));
	return sameItems ? draft : document;
}

/**
 * The tile arrows: one place backward (-1) or forward (1).
 *
 * @param {string[]} keys
 * @param {string}   key
 * @param {-1|1}     offset
 * @return {string[]} The new order; `keys` past either end or for an unknown key.
 */
export function moveReorderKey(keys, key, offset) {
	const from = keys.indexOf(key);
	const to = from + offset;
	if (from < 0 || to < 0 || to >= keys.length) {
		return keys;
	}
	return arrayMove(keys, from, to);
}

/**
 * A drop: the dragged item takes the place of the one under it.
 *
 * @param {string[]} keys
 * @param {string}   activeKey The dragged item.
 * @param {string}   overKey   The item it was dropped on.
 * @return {string[]} The new order; `keys` for a drop on itself or an unknown key.
 */
export function dropReorderKey(keys, activeKey, overKey) {
	const from = keys.indexOf(activeKey);
	const to = keys.indexOf(overKey);
	if (from < 0 || to < 0 || from === to) {
		return keys;
	}
	return arrayMove(keys, from, to);
}
