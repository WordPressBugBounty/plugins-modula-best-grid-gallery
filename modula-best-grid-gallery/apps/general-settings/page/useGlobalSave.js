import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import useStateContext from '../context/useStateContext';
import { clearSaved } from '../context/actions';
import { useSettingsMutation } from '../query/useSettingsMutation';
import {
	buildSavePayload,
	hasPendingEdits,
	saveErrorMessage,
} from '../model/settingsPageModel';

const NO_TOAST = { message: '', tone: 'success' };

/**
 * @param {boolean} isSaving
 * @param {boolean} hasEdits
 * @return {'saving'|'dirty'|'saved'} Header save state.
 */
function saveStateOf(isSaving, hasEdits) {
	if (isSaving) {
		return 'saving';
	}

	return hasEdits ? 'dirty' : 'saved';
}

/**
 * The page's single Save: posts every pending option whole. On success the
 * saved edits are cleared (the mutation refetches first) and a toast
 * confirms; on failure the edits stay and the server message is shown.
 *
 * @return {{ saveState: string, hasEdits: boolean, save: Function, toast: Object, dismissToast: Function }} Save state and actions.
 */
export function useGlobalSave() {
	const { state, dispatch } = useStateContext();
	const mutation = useSettingsMutation();
	const [toast, setToast] = useState(NO_TOAST);
	const hasEdits = hasPendingEdits(state.options);

	const save = () => {
		const payload = buildSavePayload(state.options);
		// Clear the previous toast so a repeated message is announced again.
		setToast(NO_TOAST);
		mutation.mutate(payload, {
			onSuccess: () => {
				dispatch(clearSaved(payload));
				setToast({
					message: __('Settings saved', 'modula-best-grid-gallery'),
					tone: 'success',
				});
			},
			onError: (error) => {
				setToast({
					message: saveErrorMessage(
						error,
						__(
							'Settings could not be saved.',
							'modula-best-grid-gallery'
						)
					),
					tone: 'error',
				});
			},
		});
	};

	return {
		saveState: saveStateOf(mutation.isPending, hasEdits),
		hasEdits,
		save,
		toast,
		dismissToast: () => setToast(NO_TOAST),
	};
}
