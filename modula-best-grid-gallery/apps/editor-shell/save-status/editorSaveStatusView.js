/**
 * The one save state the top bar shows: the editor save session (parts stored
 * on Save, ADR 0059) merged with the write queue, which carries the session
 * parts' own requests.
 *
 * @package
 */

/** @typedef {import('./saveStatusModel').TakeoverSaveUiStatus} TakeoverSaveUiStatus */

/**
 * @typedef {Object} EditorSaveSessionView
 * @property {TakeoverSaveUiStatus} status            The session's status.
 * @property {boolean}              hasUnsavedChanges Whether any session part has unsaved changes.
 * @property {string}               errorMessage      The failed part's message, or ''.
 */

/**
 * @typedef {Object} EditorSaveStatus
 * @property {TakeoverSaveUiStatus} status       What the save state reads.
 * @property {string}               errorMessage Shown for `error`, or ''.
 * @property {boolean}              canRetry     True when the failure is the session's, which Retry resends.
 */

/**
 * A failure wins, the session's first because Retry can resend it. Otherwise
 * any write running shows Saving, then anything unsaved in either shows
 * Unsaved changes, so unsaved session parts never read as saved while the
 * queue is idle.
 *
 * @param {{ status: TakeoverSaveUiStatus, saveErrorMessage?: string }} queue   The write queue's view (`useTakeoverSaveStatus`).
 * @param {EditorSaveSessionView|null}                                  session Null when the editor mounts no session.
 * @return {EditorSaveStatus} What the save state shows.
 */
export function mergeEditorSaveStatus(queue, session) {
	if (session?.status === 'error') {
		return {
			status: 'error',
			errorMessage: session.errorMessage,
			canRetry: true,
		};
	}
	// A session part's write leaves its failure in the queue until that part's
	// next write succeeds. During Retry the failure would otherwise read on
	// while the part is sent again, and hide Retry's own Saving.
	if (session?.status === 'saving') {
		return { status: 'saving', errorMessage: '', canRetry: false };
	}
	if (queue.status === 'error') {
		return {
			status: 'error',
			errorMessage: queue.saveErrorMessage || '',
			canRetry: false,
		};
	}
	const statuses = [queue.status, session?.status];
	let status = 'saved';
	if (statuses.includes('saving')) {
		status = 'saving';
	} else if (statuses.includes('unsaved')) {
		status = 'unsaved';
	}
	return { status, errorMessage: '', canRetry: false };
}
