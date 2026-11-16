/**
 * The recovery copy of one editor save session (ADR 0059): keeps this
 * browser's copy of the document's unsaved changes in step with the session,
 * and offers a copy left by an earlier visit.
 *
 * - After edits pause (`delayMs`, then when the browser is idle) the copy is
 *   rewritten with the session's recovery snapshot, or removed when nothing is
 *   unsaved. A burst of changes (a drag) writes once, after it, never inside a
 *   pointer event.
 * - When a save run ends the copy follows at once: removed after a save that
 *   stored everything with no edit meanwhile, otherwise rewritten with what is
 *   still unsaved.
 * - The copy carries the saved-state marker of the state it was based on. The
 *   editor reports the marker its own writes return (`adoptSavedState`), so
 *   its own saves never look like a save made elsewhere.
 * - On open, a copy is offered (`getOffer`) and never applied without a
 *   choice. Until Restore or Discard, the copy is left as it is; the first
 *   edit or a Save while the offer waits answers it as Discard.
 *
 * Document-agnostic: the session's parts decide what their state is and how it
 * is restored. Storage failures stay silent (see `recoveryCopyStore`).
 */
import {
	readRecoveryCopy,
	removeRecoveryCopy,
	writeRecoveryCopy,
} from './recoveryCopyStore';

/** Quiet time after the last change before the copy is written. */
export const RECOVERY_COPY_DELAY_MS = 1000;

/** Longest wait for an idle moment once the quiet time has passed. */
const IDLE_TIMEOUT_MS = 1000;

/**
 * @typedef {Object} RecoveryCopyOffer
 * @property {boolean} savedElsewhere The document was saved since the copy was made; Restore overwrites that.
 */

/**
 * @param {() => void} task
 * @return {(() => void)|null} Cancels the task if it has not run; null when it ran at once (no idle callbacks in this browser).
 */
function whenIdle(task) {
	if (typeof window.requestIdleCallback !== 'function') {
		task();
		return null;
	}
	const handle = window.requestIdleCallback(task, {
		timeout: IDLE_TIMEOUT_MS,
	});
	return () => window.cancelIdleCallback(handle);
}

/** @typedef {ReturnType<typeof import('../save-status/editorSaveSession').createEditorSaveSession>} EditorSaveSession */
/** @typedef {import('./recoveryCopyStore').RecoveryDocumentIdentity} RecoveryDocumentIdentity */
/** @typedef {import('./recoveryCopyStore').SavedStateMarker} SavedStateMarker */

/**
 * @param {Object}                   args
 * @param {EditorSaveSession}        args.session
 * @param {RecoveryDocumentIdentity} args.identity
 * @param {SavedStateMarker}         args.savedState The document's saved-state marker when the editor opened (null: never saved).
 * @param {number}                   [args.delayMs]  Quiet time before a write.
 * @return {Object} The controller: `start`, `stop`, `getOffer`, `subscribe`, `restore`, `discard`, `adoptSavedState`, `flush`.
 */
export function createRecoveryCopyController({
	session,
	identity,
	savedState,
	delayMs = RECOVERY_COPY_DELAY_MS,
}) {
	let currentSavedState = savedState ?? null;
	const found = readRecoveryCopy(identity, currentSavedState);
	/** @type {{ payload: unknown, offer: RecoveryCopyOffer }|null} */
	let pendingOffer = found
		? {
				payload: found.payload,
				offer: { savedElsewhere: found.savedElsewhere },
			}
		: null;
	const listeners = new Set();
	let timer = null;
	let cancelIdle = null;
	let lastStatus = session.getStatus();
	let unsubscribers = [];

	function cancelPendingWrite() {
		clearTimeout(timer);
		timer = null;
		cancelIdle?.();
		cancelIdle = null;
	}

	/** Bring the stored copy in line with the session now. */
	function writeNow() {
		cancelPendingWrite();
		if (pendingOffer || session.getStatus() === 'saving') {
			return;
		}
		const payload = session.hasUnsavedChanges()
			? session.getRecoverySnapshot()
			: null;
		if (payload === null) {
			removeRecoveryCopy(identity);
			return;
		}
		// A copy the browser refuses (quota, blocked storage) is not kept; editing goes on.
		writeRecoveryCopy(identity, {
			payload,
			savedMarker: currentSavedState,
		});
	}

	function scheduleWrite() {
		cancelPendingWrite();
		timer = setTimeout(() => {
			timer = null;
			cancelIdle = whenIdle(() => {
				cancelIdle = null;
				writeNow();
			});
		}, delayMs);
	}

	function answerOffer() {
		pendingOffer = null;
		listeners.forEach((listener) => listener());
	}

	/** Remove the offered copy; what the editor holds is the state to keep. */
	function discardOffer() {
		answerOffer();
		removeRecoveryCopy(identity);
	}

	/**
	 * A change that leaves something unsaved, while the offer waits, is an
	 * edit on top of the saved state: the offer is taken as Discard, so the
	 * copy can follow the new edits instead of a state they did not start from.
	 */
	function onChange() {
		if (pendingOffer && session.hasUnsavedChanges()) {
			discardOffer();
		}
		if (!pendingOffer) {
			scheduleWrite();
		}
	}

	/**
	 * A save run that ends decides the copy at once. A save that starts while
	 * the offer waits takes it as Discard: the old copy must not outlive the
	 * newer save it would overwrite.
	 */
	function onStatusChange() {
		const status = session.getStatus();
		const runEnded = lastStatus === 'saving' && status !== 'saving';
		lastStatus = status;
		if (pendingOffer && status === 'saving') {
			discardOffer();
		}
		if (runEnded) {
			writeNow();
		}
	}

	return {
		/** Follow the session's changes and save runs. */
		start() {
			lastStatus = session.getStatus();
			unsubscribers = [
				session.subscribeChanges(onChange),
				session.subscribe(onStatusChange),
			];
		},
		/** Stop following the session; a write still waiting is dropped. */
		stop() {
			unsubscribers.forEach((unsubscribe) => unsubscribe());
			unsubscribers = [];
			cancelPendingWrite();
		},
		/** @return {RecoveryCopyOffer|null} The copy waiting for Restore or Discard. */
		getOffer: () => pendingOffer?.offer ?? null,
		/**
		 * @param {() => void} listener Called when the offer is answered.
		 * @return {() => void} Unsubscribes.
		 */
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		/** Apply the offered copy as unsaved changes; the copy then follows the editor again. */
		restore() {
			if (!pendingOffer) {
				return;
			}
			const { payload } = pendingOffer;
			answerOffer();
			session.restoreRecoverySnapshot(payload);
			scheduleWrite();
		},
		/** Remove the offered copy; the editor keeps the saved state (and any edit made since it opened). */
		discard() {
			if (!pendingOffer) {
				return;
			}
			discardOffer();
			scheduleWrite();
		},
		/**
		 * The marker of the document's saved state after one of the editor's
		 * own writes.
		 *
		 * @param {SavedStateMarker} marker
		 */
		adoptSavedState(marker) {
			currentSavedState = marker ?? null;
		},
		/** Write a pending change now (the page is being hidden or left). */
		flush() {
			if (timer !== null || cancelIdle !== null) {
				writeNow();
			}
		},
	};
}
