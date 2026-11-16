/**
 * The media picker's selection: the picked ids and the anchor a Shift press
 * extends from, as in the WordPress media library.
 *
 * @typedef {{ selectedIds: Set<number>, anchorId: number|null }} PickerSelection
 * `anchorId`: the item last pressed without Shift; null before any press.
 */

/** @type {PickerSelection} */
export const EMPTY_PICKER_SELECTION = Object.freeze({
	selectedIds: new Set(),
	anchorId: null,
});

/**
 * @param {PickerSelection}                           selection
 * @param {number}                                    id        The pressed item.
 * @param {Array<{ id: number, disabled?: boolean }>} items     The grid, in display order.
 * @param {{ shiftKey?: boolean }}                    [options]
 * @return {PickerSelection} A plain press toggles the item and makes it the
 * anchor. A Shift press adds every pickable item from the anchor to the
 * pressed one and keeps the anchor; without an anchor in the grid (first
 * press, or the search dropped it) it is a plain press.
 */
export function pressPickerItem(selection, id, items, options = {}) {
	const anchorIndex = options.shiftKey
		? items.findIndex((item) => item.id === selection.anchorId)
		: -1;
	const pressedIndex = items.findIndex((item) => item.id === id);
	if (anchorIndex === -1 || pressedIndex === -1) {
		return togglePickerItem(selection, id);
	}

	const selectedIds = new Set(selection.selectedIds);
	items
		.slice(
			Math.min(anchorIndex, pressedIndex),
			Math.max(anchorIndex, pressedIndex) + 1
		)
		.filter((item) => !item.disabled)
		.forEach((item) => selectedIds.add(item.id));
	return { selectedIds, anchorId: selection.anchorId };
}

/**
 * @param {PickerSelection} selection
 * @param {number}          id
 * @return {PickerSelection} The item picked or unpicked, and now the anchor.
 */
function togglePickerItem(selection, id) {
	const selectedIds = new Set(selection.selectedIds);
	if (!selectedIds.delete(id)) {
		selectedIds.add(id);
	}
	return { selectedIds, anchorId: id };
}
