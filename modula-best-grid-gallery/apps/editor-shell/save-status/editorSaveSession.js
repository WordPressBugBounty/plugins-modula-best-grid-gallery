/**
 * Editor save session: one explicit editor save (ADR 0059) for the gallery
 * editor and the Albums editor.
 *
 * The editor names its parts' keys in save order, plus the order for the first
 * save of a never-saved document, and registers each part under its key. A
 * part reports whether it has unsaved changes and saves itself; after a
 * successful save its baseline is the state it sent, so edits made meanwhile
 * keep reporting unsaved changes. The session owns the order, skipping clean
 * parts, stopping at a failure and what Retry sends. It knows nothing about
 * galleries or albums.
 *
 * @package
 */

/** @typedef {import('./saveStatusModel').TakeoverSaveUiStatus} TakeoverSaveUiStatus */

/**
 * @typedef {Object} EditorSavePart
 * @property {string}                      key                       One of the session's order keys.
 * @property {() => boolean}               hasUnsavedChanges         Whether the part differs from its saved baseline.
 * @property {() => Promise<void>}         save                      Writes the part; rejects on failure.
 * @property {boolean}                     [saveOnFirstSave]         Saved in every run of a never-saved document, even without unsaved changes of its own (e.g. the post fields, which take the document out of auto-draft before any content write). It alone never makes a save start.
 * @property {() => unknown}               [getRecoverySnapshot]     The part's unsaved state for the recovery copy, JSON-serializable. Asked only while the part has unsaved changes.
 * @property {(snapshot: unknown) => void} [restoreRecoverySnapshot] Applies a snapshot from `getRecoverySnapshot` through the part's normal change path, so it shows as unsaved changes against the unchanged saved baseline. Validates the snapshot; one it cannot use changes nothing.
 */

/**
 * A recovery snapshot of the document: each recoverable part's unsaved
 * state under its key. The session does not look inside a part's state.
 *
 * @typedef {Record<string, unknown>} EditorRecoverySnapshot
 */

/**
 * @typedef {Object} EditorSaveFailure
 * @property {string}  key   The part whose save rejected.
 * @property {unknown} error Its rejection reason.
 */

/**
 * @param {string[]} order
 * @param {string[]} firstSaveOrder
 * @throws {Error} When either order repeats a key or they list different keys.
 */
function assertSameParts(order, firstSaveOrder) {
	const keys = new Set(order);
	const isPermutation =
		keys.size === order.length &&
		new Set(firstSaveOrder).size === firstSaveOrder.length &&
		firstSaveOrder.length === order.length &&
		firstSaveOrder.every((key) => keys.has(key));
	if (!isPermutation) {
		throw new Error(
			'Editor save session: the first-save order must list each part of the order once.'
		);
	}
}

/**
 * @param {Object}        options
 * @param {string[]}      options.order          Part keys in save order for a saved document.
 * @param {string[]}      options.firstSaveOrder The same keys in save order for a never-saved document.
 * @param {() => boolean} options.isFirstSave    Asked when a save starts: whether the document was never saved.
 * @return {Object} The session: `registerPart`, `getStatus`, `hasUnsavedChanges`, `getError`, `subscribe`, `subscribeChanges`, `notifyChange`, `getRecoverySnapshot`, `restoreRecoverySnapshot`, `save`, `isNeverSaved`, `ensureSaved`, `retry`.
 */
export function createEditorSaveSession({
	order,
	firstSaveOrder,
	isFirstSave,
}) {
	assertSameParts(order, firstSaveOrder);

	/** @type {Map<string, EditorSavePart>} */
	const parts = new Map();
	const listeners = new Set();
	/** Hear every change a part reports, not only status changes. */
	const changeListeners = new Set();
	/**
	 * Restored state of parts not registered yet (an editor mounts some parts
	 * later than others), applied when they register.
	 *
	 * @type {Map<string, unknown>}
	 */
	const pendingRestores = new Map();
	/** @type {Promise<TakeoverSaveUiStatus>|null} */
	let running = null;
	/** @type {EditorSaveFailure|null} */
	let failure = null;
	/** Keys from the failed part to the end of the failed run's order: what Retry sends. */
	let remaining = [];
	let publishedStatus = 'saved';
	let publishedUnsaved = false;
	/**
	 * Whether any part is unsaved, asked once per change a part reports (and
	 * per registration and run): readers (the top bar, the leave guard, the
	 * recovery copy) are served from it, so an interaction pays for the
	 * parts' checks once.
	 */
	let knownUnsaved = false;

	/**
	 * Outside a run, a part whose check throws counts as unsaved: the next run
	 * asks it again inside its turn and records the throw as that part's failure.
	 *
	 * @param {EditorSavePart} part
	 * @return {boolean} Whether the part reports (or may have) unsaved changes.
	 */
	function partMayBeUnsaved(part) {
		try {
			return part.hasUnsavedChanges();
		} catch {
			return true;
		}
	}

	/** @return {boolean} Whether any part is unsaved, asking every part now. */
	function askPartsForUnsavedChanges() {
		return Array.from(parts.values()).some(partMayBeUnsaved);
	}

	/** @return {boolean} Whether any part was unsaved at the last change reported. */
	function hasUnsavedChanges() {
		return knownUnsaved;
	}

	/**
	 * @return {TakeoverSaveUiStatus} Saving during a run, error after a failed one, else whether any part is unsaved.
	 */
	function getStatus() {
		if (running) {
			return 'saving';
		}
		if (failure) {
			return 'error';
		}
		return knownUnsaved ? 'unsaved' : 'saved';
	}

	/** Asks the parts once, then tells subscribers when the status or whether anything is unsaved changed. */
	function publish() {
		knownUnsaved = askPartsForUnsavedChanges();
		const status = getStatus();
		const unsaved = knownUnsaved;
		if (status === publishedStatus && unsaved === publishedUnsaved) {
			return;
		}
		publishedStatus = status;
		publishedUnsaved = unsaved;
		listeners.forEach((listener) => listener());
	}

	/** A part's unsaved changes may have changed: tell both kinds of subscribers. */
	function notifyChange() {
		publish();
		changeListeners.forEach((listener) => listener());
	}

	/**
	 * @param {EditorSavePart} part
	 * @return {boolean} Whether the part can be recovered and reports unsaved changes; a check that throws reports none.
	 */
	function hasRecoverableChanges(part) {
		if (typeof part.getRecoverySnapshot !== 'function') {
			return false;
		}
		try {
			return part.hasUnsavedChanges();
		} catch {
			// Its save will report the failure; there is no state to keep.
			return false;
		}
	}

	/**
	 * @return {EditorRecoverySnapshot|null} Each recoverable part's unsaved state (and restored state still waiting for its part), or null when there is none.
	 */
	function getRecoverySnapshot() {
		const snapshot = {};
		for (const key of order) {
			const part = parts.get(key);
			if (pendingRestores.has(key)) {
				snapshot[key] = pendingRestores.get(key);
			} else if (part && hasRecoverableChanges(part)) {
				snapshot[key] = part.getRecoverySnapshot();
			}
		}
		return Object.keys(snapshot).length > 0 ? snapshot : null;
	}

	/**
	 * @param {EditorSavePart} part
	 * @param {unknown}        partSnapshot
	 * @return {boolean} Whether the part took the snapshot.
	 */
	function restorePart(part, partSnapshot) {
		if (typeof part?.restoreRecoverySnapshot !== 'function') {
			return false;
		}
		part.restoreRecoverySnapshot(partSnapshot);
		return true;
	}

	/**
	 * Apply a recovery snapshot: each registered part restores its state;
	 * the state of a part that is not registered yet waits for it. Keys the
	 * editor does not save are ignored.
	 *
	 * @param {EditorRecoverySnapshot} snapshot
	 */
	function restoreRecoverySnapshot(snapshot) {
		if (!snapshot || typeof snapshot !== 'object') {
			return;
		}
		for (const key of order) {
			if (!Object.hasOwn(snapshot, key)) {
				continue;
			}
			if (!restorePart(parts.get(key), snapshot[key])) {
				pendingRestores.set(key, snapshot[key]);
			}
		}
		notifyChange();
	}

	/**
	 * Save the parts of `runOrder` that have unsaved changes, one after another.
	 * Each part is asked at its turn, so a part that gains changes before its
	 * turn is saved in this run. A check that throws fails that part like a
	 * rejected save.
	 *
	 * @param {string[]} runOrder
	 * @param {boolean}  firstSave Whether the document was never saved when the run started.
	 */
	async function run(runOrder, firstSave) {
		for (const [index, key] of runOrder.entries()) {
			const part = parts.get(key);
			if (!part) {
				continue;
			}
			try {
				const isRequired = firstSave && part.saveOnFirstSave === true;
				if (!isRequired && !part.hasUnsavedChanges()) {
					continue;
				}
				await part.save();
			} catch (error) {
				failure = { key, error };
				remaining = runOrder.slice(index);
				return;
			}
		}
	}

	/**
	 * @param {string[]} runOrder
	 * @param {boolean}  firstSave Whether the document was never saved, asked as the run starts.
	 * @return {Promise<TakeoverSaveUiStatus>} The status after the run.
	 */
	function start(runOrder, firstSave) {
		failure = null;
		remaining = [];
		running = run(runOrder, firstSave).then(() => {
			running = null;
			publish();
			return getStatus();
		});
		publish();
		return running;
	}

	/**
	 * Save every part with unsaved changes. During a running save, returns
	 * that save instead of starting another.
	 *
	 * @return {Promise<TakeoverSaveUiStatus>} The status after the run; never rejects.
	 */
	function save() {
		if (running) {
			return running;
		}
		// An action asks the parts now, not the last reported state.
		if (!askPartsForUnsavedChanges()) {
			return Promise.resolve(getStatus());
		}
		const firstSave = isFirstSave();
		return start(firstSave ? firstSaveOrder : order, firstSave);
	}

	return {
		/**
		 * @param {EditorSavePart} part
		 * @return {() => void} Unregisters this part.
		 * @throws {Error} When the key is not in the order or already registered.
		 */
		registerPart(part) {
			if (!order.includes(part.key)) {
				throw new Error(
					`Editor save session: unknown part "${part.key}".`
				);
			}
			if (parts.has(part.key)) {
				throw new Error(
					`Editor save session: part "${part.key}" is already registered.`
				);
			}
			parts.set(part.key, part);
			if (
				pendingRestores.has(part.key) &&
				restorePart(part, pendingRestores.get(part.key))
			) {
				pendingRestores.delete(part.key);
			}
			notifyChange();
			return () => {
				if (parts.get(part.key) === part) {
					parts.delete(part.key);
					publish();
				}
			};
		},
		getStatus,
		/**
		 * Whether any part has unsaved changes, as of the last change a part
		 * reported (`notifyChange`), a registration or a run. Unlike the
		 * status, it stays true or false through a run and after a failure.
		 */
		hasUnsavedChanges,
		/** @return {EditorSaveFailure|null} The failure of the latest run, if it failed. */
		getError: () => failure,
		/**
		 * @param {() => void} listener Called when the status or `hasUnsavedChanges()` changes.
		 * @return {() => void} Unsubscribes.
		 */
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		/**
		 * @param {() => void} listener Called on every change a part reports (`notifyChange`), a registration and a restore.
		 * @return {() => void} Unsubscribes.
		 */
		subscribeChanges(listener) {
			changeListeners.add(listener);
			return () => changeListeners.delete(listener);
		},
		/** A part calls this when its unsaved changes may have changed. */
		notifyChange,
		getRecoverySnapshot,
		restoreRecoverySnapshot,
		save,
		/** @return {boolean} Whether the document was never saved (asked now). */
		isNeverSaved: () => isFirstSave(),
		/**
		 * Like `save()`, but a never-saved document is stored (its first
		 * save) even without unsaved changes: for an action that writes the
		 * document at once, which must not write a document no editor save
		 * stored.
		 *
		 * @return {Promise<TakeoverSaveUiStatus>} The status after the run; never rejects.
		 */
		ensureSaved() {
			if (running) {
				return running;
			}
			if (isFirstSave()) {
				return start(firstSaveOrder, true);
			}
			return save();
		},
		/**
		 * After a failed save, save the failed part and the parts after it in
		 * that run's order, skipping any that no longer have unsaved changes.
		 * Whether the document was never saved is asked again: a part that
		 * succeeded before the failure may have saved it.
		 *
		 * @return {Promise<TakeoverSaveUiStatus>} The status after the run; never rejects.
		 */
		retry() {
			if (running) {
				return running;
			}
			if (!failure) {
				return Promise.resolve(getStatus());
			}
			return start(remaining, isFirstSave());
		},
	};
}
