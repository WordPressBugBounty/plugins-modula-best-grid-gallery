/**
 * Takeover save-status contract shared by the gallery and Albums editors.
 *
 * Each queued write reports under an owner (a write boundary such as the items
 * or the post fields). A failure stays visible until a later write of the same
 * owner succeeds; writes of other owners never clear it. Dismissing hides the
 * notice message only. Unsaved changes are the editor save session's
 * (ADR 0059); this model only knows the writes in the queue.
 *
 * The state is mutable and owned by one provider; every function updates it in
 * place and `deriveSaveStatus` projects what the UI shows.
 *
 * @package
 */

/** @typedef {'saved' | 'saving' | 'unsaved' | 'error'} TakeoverSaveUiStatus */

/**
 * @typedef {Object} SaveStatusState
 * @property {number}              active    Writes running now.
 * @property {number}              pending   Writes queued or running.
 * @property {Map<unknown,string>} failures  Owner → last failure message.
 * @property {Set<unknown>}        dismissed Owners whose failure notice was dismissed.
 * @property {number|null}         savedAt   When the latest write succeeded (ms), or null before the first.
 */

/**
 * @return {SaveStatusState} Empty state: nothing queued, nothing failed.
 */
export function createSaveStatusState() {
	return {
		active: 0,
		pending: 0,
		failures: new Map(),
		dismissed: new Set(),
		savedAt: null,
	};
}

/**
 * @param {SaveStatusState} state
 */
export function queueWrite(state) {
	state.pending += 1;
}

/**
 * @param {SaveStatusState} state
 */
export function startWrite(state) {
	state.active += 1;
}

/**
 * @param {SaveStatusState} state
 * @param {unknown}         owner
 * @param {number}          [at]  Time of the acknowledgement (ms).
 */
export function writeSucceeded(state, owner, at = Date.now()) {
	state.savedAt = at;
	state.failures.delete(owner);
	state.dismissed.delete(owner);
}

/**
 * @param {SaveStatusState} state
 * @param {unknown}         owner
 * @param {unknown}         error Rejection reason; its `message` is shown when present.
 */
export function writeFailed(state, owner, error) {
	state.failures.set(owner, String(error?.message ?? error));
	state.dismissed.delete(owner);
}

/**
 * @param {SaveStatusState} state
 */
export function finishWrite(state) {
	state.active -= 1;
	state.pending -= 1;
}

/**
 * Hide every current failure notice; the save status keeps the failure until it recovers.
 *
 * @param {SaveStatusState} state
 */
export function dismissSaveFailures(state) {
	for (const owner of state.failures.keys()) {
		state.dismissed.add(owner);
	}
}

/**
 * @param {SaveStatusState} state
 * @return {{ status: TakeoverSaveUiStatus, errorMessage: string, saveErrorMessage: string, savedAt: number|null }}
 *   `saveErrorMessage` is the first failure (save indicator); `errorMessage` the
 *   first undismissed one (dismissible notices); `savedAt` the latest success.
 */
export function deriveSaveStatus(state) {
	const saveErrorMessage = state.failures.values().next().value || '';
	const notice = Array.from(state.failures).find(
		([owner]) => !state.dismissed.has(owner)
	);
	const errorMessage = notice?.[1] || '';
	const { savedAt } = state;
	if (state.failures.size > 0) {
		return { status: 'error', errorMessage, saveErrorMessage, savedAt };
	}
	if (state.active > 0) {
		return { status: 'saving', errorMessage, saveErrorMessage, savedAt };
	}
	return {
		status: state.pending > 0 ? 'unsaved' : 'saved',
		errorMessage,
		saveErrorMessage,
		savedAt,
	};
}
