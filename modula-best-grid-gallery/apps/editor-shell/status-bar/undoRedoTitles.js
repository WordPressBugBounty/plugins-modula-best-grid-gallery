import { __, sprintf } from '@wordpress/i18n';

/**
 * Accessible names for the status-bar undo/redo buttons.
 *
 * @param {{ undoStepLabel?: string, redoStepLabel?: string, canRedo: boolean }} args
 * @return {{ undoTitle: string, redoTitle: string }} Titles naming the step each button applies.
 */
export function getUndoRedoTitles({ undoStepLabel, redoStepLabel, canRedo }) {
	const undoTitle = undoStepLabel
		? sprintf(
				/* translators: %s: description of the settings change to undo */
				__('Undo: %s', 'modula-best-grid-gallery'),
				undoStepLabel
			)
		: __('Undo', 'modula-best-grid-gallery');

	if (redoStepLabel) {
		return {
			undoTitle,
			redoTitle: sprintf(
				/* translators: %s: description of the settings change to redo */
				__('Redo: %s', 'modula-best-grid-gallery'),
				redoStepLabel
			),
		};
	}
	return {
		undoTitle,
		redoTitle: canRedo
			? __('Redo', 'modula-best-grid-gallery')
			: __('Nothing to redo', 'modula-best-grid-gallery'),
	};
}
