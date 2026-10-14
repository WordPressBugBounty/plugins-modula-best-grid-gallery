/**
 * Takeover save-status contract shared by the gallery and Albums editors.
 *
 * Each write reports under an owner (a write boundary such as settings, members
 * or the document title). A failure stays visible until a later write of the
 * same owner succeeds with no newer edits pending for it; writes of other
 * owners never clear it. Dismissing hides the notice message only.
 *
 * The state is mutable and owned by one provider; every function updates it in
 * place and `deriveSaveStatus` projects what the UI shows.
 *
 * @package
 */

/** @typedef {'saved' | 'saving' | 'unsaved' | 'error'} TakeoverSaveUiStatus */

/**
 * @typedef {Object} SaveStatusState
 * @property {number}               active    Writes running now.
 * @property {number}               pending   Writes queued or running.
 * @property {Map<unknown,boolean>} dirty     Owner → unsaved local edits.
 * @property {Map<unknown,string>}  failures  Owner → last failure message.
 * @property {Set<unknown>}         recovered Owners whose latest write succeeded while still dirty.
 * @property {Set<unknown>}         dismissed Owners whose failure notice was dismissed.
 */

/**
 * @return {SaveStatusState} Empty state: nothing dirty, nothing failed.
 */
export function createSaveStatusState() {
	return {
		active: 0,
		pending: 0,
		dirty: new Map(),
		failures: new Map(),
		recovered: new Set(),
		dismissed: new Set(),
	};
}

/**
 * @param {SaveStatusState} state
 * @param {unknown}         owner
 */
function clearFailure(state, owner) {
	state.failures.delete(owner);
	state.dismissed.delete(owner);
	state.recovered.delete(owner);
}

/**
 * @param {SaveStatusState} state
 * @param {unknown}         owner
 * @param {boolean}         dirty
 */
export function setOwnerDirty(state, owner, dirty) {
	state.dirty.set(owner, Boolean(dirty));
	// A successful write may still have newer edits to confirm before its failure can clear.
	if (!dirty && state.recovered.has(owner)) {
		clearFailure(state, owner);
	}
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
 */
export function writeSucceeded(state, owner) {
	state.recovered.add(owner);
	if (!state.dirty.get(owner)) {
		clearFailure(state, owner);
	}
}

/**
 * @param {SaveStatusState} state
 * @param {unknown}         owner
 * @param {unknown}         error Rejection reason; its `message` is shown when present.
 */
export function writeFailed(state, owner, error) {
	state.recovered.delete(owner);
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
 * @return {{ status: TakeoverSaveUiStatus, errorMessage: string, saveErrorMessage: string }}
 *   `saveErrorMessage` is the first failure (save indicator); `errorMessage` the
 *   first undismissed one (dismissible notices).
 */
export function deriveSaveStatus(state) {
	const saveErrorMessage = state.failures.values().next().value || '';
	const notice = Array.from(state.failures).find(
		([owner]) => !state.dismissed.has(owner)
	);
	const errorMessage = notice?.[1] || '';
	if (state.failures.size > 0) {
		return { status: 'error', errorMessage, saveErrorMessage };
	}
	if (state.active > 0) {
		return { status: 'saving', errorMessage, saveErrorMessage };
	}
	const hasPending =
		state.pending > 0 || Array.from(state.dirty.values()).some(Boolean);
	return {
		status: hasPending ? 'unsaved' : 'saved',
		errorMessage,
		saveErrorMessage,
	};
}
