/**
 * Preview item selection and the image panel, as one state.
 *
 * A tile click selects (`select`); "Edit" opens the panel (`open`). While the
 * panel is open it always shows the selected tile: `editIndex` is either null
 * or equal to `selectedIndex`.
 *
 * @typedef {'edit'|'focus'} GalleryItemEditView
 * @typedef {{
 *   selectedIndex: number|null,
 *   editIndex: number|null,
 *   view: GalleryItemEditView,
 * }} ItemSelectionState
 */

/** @type {ItemSelectionState} */
export const INITIAL_ITEM_SELECTION = Object.freeze({
	selectedIndex: null,
	editIndex: null,
	view: 'edit',
});

function isStoreIndex(index) {
	return Number.isInteger(index) && index >= 0;
}

/**
 * @param {ItemSelectionState} state
 * @return {ItemSelectionState} One step back: focus view, then panel, then selection.
 */
function escape(state) {
	if (state.view === 'focus') {
		return { ...state, view: 'edit' };
	}
	if (state.editIndex !== null) {
		return { ...state, editIndex: null };
	}
	if (state.selectedIndex !== null) {
		return INITIAL_ITEM_SELECTION;
	}
	return state;
}

/** Actions that take a store index; an invalid index leaves the state as it is. */
const INDEXED = {
	select: (state, index) => ({
		...state,
		selectedIndex: index,
		editIndex: state.editIndex === null ? null : index,
		view: state.editIndex === null ? state.view : 'edit',
	}),
	open: (state, index) => ({
		selectedIndex: index,
		editIndex: index,
		view: 'edit',
	}),
	openFocus: (state, index) => ({
		selectedIndex: index,
		editIndex: index,
		view: 'focus',
	}),
};

const PLAIN = {
	closeFocus: (state) => ({ ...state, view: 'edit' }),
	back: (state) => ({ ...state, editIndex: null, view: 'edit' }),
	clear: () => INITIAL_ITEM_SELECTION,
	escape,
};

/**
 * @param {ItemSelectionState}               state
 * @param {{type: string, index?: number}}   action
 * @return {ItemSelectionState} Next state.
 */
export function itemSelectionReducer(state, action) {
	if (Object.hasOwn(INDEXED, action.type)) {
		return isStoreIndex(action.index)
			? INDEXED[action.type](state, action.index)
			: state;
	}
	if (Object.hasOwn(PLAIN, action.type)) {
		return PLAIN[action.type](state);
	}
	throw new Error(`Unknown item selection action: ${action.type}`);
}
