/**
 * Copy for the gallery editor's "Move to Caption" notice.
 */
import { _n, sprintf } from '@wordpress/i18n';

/** Skip reason from the move-to-caption route: the user cannot edit the attachment. */
const SKIP_CANNOT_EDIT = 'cannot_edit';

/**
 * @typedef {{ id: number, reason: string }} MoveToCaptionSkip
 * @typedef {{ moved: number[], skipped: MoveToCaptionSkip[] }} MoveToCaptionOutcome
 */

/**
 * @param {MoveToCaptionSkip[]} skipped
 * @return {string[]} One line per skip kind, cannot-edit first.
 */
function describeSkipped(skipped) {
	const cannotEdit = skipped.filter(
		(skip) => SKIP_CANNOT_EDIT === skip.reason
	).length;
	const failed = skipped.length - cannotEdit;
	const lines = [];

	if (cannotEdit > 0) {
		lines.push(
			sprintf(
				/* translators: %d: number of images */
				_n(
					"%d image was skipped because you can't edit it.",
					"%d images were skipped because you can't edit them.",
					cannotEdit,
					'modula-best-grid-gallery'
				),
				cannotEdit
			)
		);
	}
	if (failed > 0) {
		lines.push(
			sprintf(
				/* translators: %d: number of images */
				_n(
					"%d image couldn't be moved. Try again.",
					"%d images couldn't be moved. Try again.",
					failed,
					'modula-best-grid-gallery'
				),
				failed
			)
		);
	}

	return lines;
}

/**
 * The notice is shown while the gallery still has images whose caption is only in
 * the Media Library Description. The count comes from the editor bootstrap, so it
 * reaches 0 after a move or a normal save, and the notice goes away.
 *
 * @param {unknown}                   captionsToMove Bootstrap `metadata.captionsToMove`.
 * @param {MoveToCaptionOutcome|null} outcome        Last move result, if any.
 * @return {{ message: string, skippedMessages: string[] }|null} Null when there is nothing to move.
 */
export function describeMoveToCaptionNotice(captionsToMove, outcome) {
	const count = Number(captionsToMove) || 0;
	if (count < 1) {
		return null;
	}

	return {
		message: sprintf(
			/* translators: %d: number of images */
			_n(
				"%d image keeps its caption in Description. Albums and other galleries can't show it.",
				"%d images keep their caption in Description. Albums and other galleries can't show it.",
				count,
				'modula-best-grid-gallery'
			),
			count
		),
		skippedMessages: Array.isArray(outcome?.skipped)
			? describeSkipped(outcome.skipped)
			: [],
	};
}
