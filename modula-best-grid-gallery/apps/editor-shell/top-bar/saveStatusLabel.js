import { __ } from '@wordpress/i18n';

/**
 * Human label for the shared save state.
 *
 * @param {{ status: string, errorMessage?: string }} saveStatus
 * @return {string} Saved / Saving… / Unsaved changes, or the error message.
 */
export function getSaveStatusLabel({ status, errorMessage = '' }) {
	if (status === 'error' && errorMessage) {
		return errorMessage;
	}
	if (status === 'saving') {
		return __('Saving…', 'modula-best-grid-gallery');
	}
	if (status === 'unsaved') {
		return __('Unsaved changes', 'modula-best-grid-gallery');
	}
	return __('Saved', 'modula-best-grid-gallery');
}
