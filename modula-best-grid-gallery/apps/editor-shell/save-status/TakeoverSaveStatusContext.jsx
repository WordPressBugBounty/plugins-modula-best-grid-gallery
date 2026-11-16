/**
 * Takeover write queue: one "Saved / Saving… / error" state, plus the time of
 * the latest success, for the writes an editor runs through `runPersistTask`.
 * Unsaved changes and Save belong to the editor save session (ADR 0059,
 * `EditorSaveSessionContext`); the top bar merges both views.
 *
 * Kept for its callers: the gallery editor's items and post-fields parts run
 * their save requests through it, so the top bar's save state and the
 * recovery copy's saved-state marker follow them. Only Pro 3.0.24 or newer
 * loads in the new editor (spec decision 29), and it writes nothing through
 * the queue. The rules live in `saveStatusModel`; this provider serializes
 * writes and re-renders on change.
 */
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import {
	createSaveStatusState,
	deriveSaveStatus,
	dismissSaveFailures,
	finishWrite,
	queueWrite,
	startWrite,
	writeFailed,
	writeSucceeded,
} from './saveStatusModel';

const TakeoverSaveStatusContext = createContext(null);

const INITIAL_VIEW = deriveSaveStatus(createSaveStatusState());

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function TakeoverSaveStatusProvider({ children }) {
	/** Serializes writes so two writes of one document cannot race. */
	const persistQueueRef = useRef(Promise.resolve());
	const saveStateRef = useRef(createSaveStatusState());
	/** @type {import('react').MutableRefObject<Set<(result: unknown) => void>>} */
	const writeResultListenersRef = useRef(new Set());
	const [view, setView] = useState(INITIAL_VIEW);

	const refreshStatus = useCallback(() => {
		const next = deriveSaveStatus(saveStateRef.current);
		setView((prev) =>
			prev.status === next.status &&
			prev.errorMessage === next.errorMessage &&
			prev.saveErrorMessage === next.saveErrorMessage &&
			prev.savedAt === next.savedAt
				? prev
				: next
		);
	}, []);

	/*
	 * Hear the result of every queued write that succeeded, e.g. to read the
	 * saved-state marker the server returns with it (recovery copy).
	 */
	const subscribeWriteResults = useCallback((listener) => {
		writeResultListenersRef.current.add(listener);
		return () => writeResultListenersRef.current.delete(listener);
	}, []);

	/** An acknowledgement recovers only its own owner; other failures remain visible. */
	const runPersistTask = useCallback(
		async (fn, owner) => {
			const state = saveStateRef.current;
			queueWrite(state);
			refreshStatus();
			const execute = async () => {
				startWrite(state);
				refreshStatus();
				try {
					const result = await fn();
					writeResultListenersRef.current.forEach((listener) =>
						listener(result)
					);
					writeSucceeded(state, owner);
					return result;
				} catch (error) {
					writeFailed(state, owner, error);
					throw error;
				} finally {
					finishWrite(state);
					refreshStatus();
				}
			};
			const next = persistQueueRef.current.then(execute);
			// The caller receives the rejection; the queue continues because the failure stays in state.
			persistQueueRef.current = next.catch(refreshStatus);
			return next;
		},
		[refreshStatus]
	);

	// Notice dismissal leaves the save indicator failure until that owner recovers.
	const clearError = useCallback(() => {
		dismissSaveFailures(saveStateRef.current);
		refreshStatus();
	}, [refreshStatus]);

	const value = useMemo(
		() => ({
			runPersistTask,
			...view,
			clearError,
			subscribeWriteResults,
		}),
		[runPersistTask, view, clearError, subscribeWriteResults]
	);

	return (
		<TakeoverSaveStatusContext.Provider value={value}>
			{children}
		</TakeoverSaveStatusContext.Provider>
	);
}

/**
 * Save status and the `runPersistTask(fn, owner)` wrapper. A write with an
 * explicit owner recovers only that owner. Without one, the calling hook
 * instance is the owner, so retries from the same producer still recover.
 * Outside a provider, writes run directly and the status stays saved.
 * `subscribeWriteResults(listener)` hears each successful queued write's
 * result and returns its unsubscribe.
 *
 * @return {Object} Save status, `runPersistTask`, `clearError`, `subscribeWriteResults`.
 */
export function useTakeoverSaveStatus() {
	const ctx = useContext(TakeoverSaveStatusContext);
	const ownerRef = useRef(null);
	if (ownerRef.current === null) {
		ownerRef.current = Symbol('takeover-write');
	}
	const persist = ctx?.runPersistTask;
	const runPersistTask = useCallback(
		(fn, owner = ownerRef.current) => {
			return persist ? persist(fn, owner) : Promise.resolve().then(fn);
		},
		[persist]
	);
	return useMemo(
		() => ({
			...INITIAL_VIEW,
			clearError: () => {},
			subscribeWriteResults: () => () => {},
			...ctx,
			runPersistTask,
		}),
		[ctx, runPersistTask]
	);
}
