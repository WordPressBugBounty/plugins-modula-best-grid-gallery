import { addPendingEdit, withoutSaved } from '../model/settingsPageModel';

export const actionTypes = {
	RECORD_EDIT: 'RECORD_EDIT',
	CLEAR_SAVED: 'CLEAR_SAVED',
	SET_DRAFT: 'SET_DRAFT',
};

export const reducer = (state, action) => {
	switch (action.type) {
		// `options`: pending edits by option, posted by the global Save.
		case actionTypes.RECORD_EDIT:
			return {
				...state,
				options: addPendingEdit(
					state.options,
					action.payload.option,
					action.payload.value
				),
			};
		case actionTypes.CLEAR_SAVED:
			return {
				...state,
				options: withoutSaved(state.options, action.payload),
			};
		// `drafts`: values of cards that do not save (Migrate), never posted.
		case actionTypes.SET_DRAFT:
			return {
				...state,
				drafts: {
					...state.drafts,
					[action.payload.option]: action.payload.value,
				},
			};
		default:
			return state;
	}
};
