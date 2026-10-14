/**
 * Takeover save status: one "Saved / Saving… / Unsaved changes / error" state for
 * every write an editor makes (settings autosave, items or members, title, status).
 * The rules live in `saveStatusModel`; this provider serializes writes and
 * re-renders on change.
 */
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { applyRestPostStatus } from './restPostStatus';
import {
	createSaveStatusState,
	deriveSaveStatus,
	dismissSaveFailures,
	finishWrite,
	queueWrite,
	setOwnerDirty,
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
	/** Serializes writes so debounced autosaves of one document cannot race. */
	const persistQueueRef = useRef(Promise.resolve());
	const saveStateRef = useRef(createSaveStatusState());
	const postStatusSyncRef = useRef(null);
	const [view, setView] = useState(INITIAL_VIEW);

	const refreshStatus = useCallback(() => {
		const next = deriveSaveStatus(saveStateRef.current);
		setView((prev) =>
			prev.status === next.status &&
			prev.errorMessage === next.errorMessage &&
			prev.saveErrorMessage === next.saveErrorMessage
				? prev
				: next
		);
	}, []);

	const setDirty = useCallback(
		(owner, dirty) => {
			setOwnerDirty(saveStateRef.current, owner, dirty);
			refreshStatus();
		},
		[refreshStatus]
	);

	const registerPostStatusSync = useCallback((fn) => {
		postStatusSyncRef.current = typeof fn === 'function' ? fn : null;
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
					applyRestPostStatus(result, postStatusSyncRef.current);
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
			setDirty,
			registerPostStatusSync,
		}),
		[runPersistTask, view, clearError, setDirty, registerPostStatusSync]
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
 *
 * @return {Object} Save status, `runPersistTask`, `setDirty(owner, dirty)`, `clearError`, `registerPostStatusSync`.
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
			setDirty: () => {},
			registerPostStatusSync: () => {},
			...ctx,
			runPersistTask,
		}),
		[ctx, runPersistTask]
	);
}
