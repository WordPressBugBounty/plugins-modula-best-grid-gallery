import { actionTypes } from './reducer';

/**
 * A card's whole new value for one option, saved by the global Save.
 *
 * @param {string} option Option name.
 * @param {*}      value  Whole option value.
 */
export const recordEdit = (option, value) => ({
	type: actionTypes.RECORD_EDIT,
	payload: { option, value },
});

/**
 * Drops the edits a successful save sent; newer edits stay pending.
 *
 * @param {Object} saved The payload that was saved.
 */
export const clearSaved = (saved) => ({
	type: actionTypes.CLEAR_SAVED,
	payload: saved,
});

/**
 * A value of a card that does not save (Migrate); kept for the page only.
 *
 * @param {string} option Option or field name.
 * @param {*}      value  Value.
 */
export const setDraft = (option, value) => ({
	type: actionTypes.SET_DRAFT,
	payload: { option, value },
});
