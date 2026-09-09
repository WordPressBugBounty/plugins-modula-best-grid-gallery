/**
 * Takeover: aggregate "Saving… / Saved" state for settings autosave and image REST writes.
 */
import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { applyRestPostStatus } from '../utils/applyRestPostStatus';

/** @typedef {'saved' | 'saving' | 'unsaved' | 'error'} TakeoverSaveUiStatus */

const TakeoverSaveStatusContext = createContext(null);

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function TakeoverSaveStatusProvider({ children }) {
	const inFlightRef = useRef(0);
	/** Serializes gallery REST writes so debounced preview persist cannot overwrite a newer modal save. */
	const persistQueueRef = useRef(/** @type {Promise<void>} */ (Promise.resolve()));
	/** Any failure while overlapping persists are in flight — last success must not hide it. */
	const anyFailureInWaveRef = useRef(false);
	const previewItemsDirtyRef = useRef(false);
	const postStatusSyncRef = useRef(
		/** @type {((slug: string, label: string) => void) | null} */ (null)
	);
	const [status, setStatus] = useState(
		/** @type {TakeoverSaveUiStatus} */ ('saved')
	);
	const [errorMessage, setErrorMessage] = useState('');

	const setPreviewItemsDirty = useCallback((dirty) => {
		const next = Boolean(dirty);
		previewItemsDirtyRef.current = next;
		setStatus((prev) => {
			if (next && prev === 'saved') {
				return 'unsaved';
			}
			if (!next && prev === 'unsaved' && inFlightRef.current === 0) {
				return 'saved';
			}
			return prev;
		});
	}, []);

	const registerPostStatusSync = useCallback((fn) => {
		postStatusSyncRef.current =
			typeof fn === 'function' ? fn : null;
	}, []);

	const runPersistTask = useCallback(async (fn) => {
		const execute = async () => {
			inFlightRef.current += 1;
			const isWaveStart = inFlightRef.current === 1;
			if (isWaveStart) {
				anyFailureInWaveRef.current = false;
				setErrorMessage('');
				setStatus('saving');
			}
			try {
				const result = await fn();
				applyRestPostStatus(result, postStatusSyncRef.current);
			} catch (e) {
				inFlightRef.current -= 1;
				if (inFlightRef.current < 0) {
					inFlightRef.current = 0;
				}
				anyFailureInWaveRef.current = true;
				setStatus('error');
				setErrorMessage(
					e?.message !== undefined && e?.message !== null
						? String(e.message)
						: String(e)
				);
				throw e;
			}
			inFlightRef.current -= 1;
			if (inFlightRef.current < 0) {
				inFlightRef.current = 0;
			}
			if (inFlightRef.current === 0 && !anyFailureInWaveRef.current) {
				setStatus(
					previewItemsDirtyRef.current ? 'unsaved' : 'saved'
				);
			}
		};

		const next = persistQueueRef.current.then(execute, execute);
		persistQueueRef.current = next.catch(() => {});
		return next;
	}, []);

	const clearError = useCallback(() => {
		setErrorMessage('');
		setStatus(previewItemsDirtyRef.current ? 'unsaved' : 'saved');
	}, []);

	const value = useMemo(
		() => ({
			runPersistTask,
			status,
			errorMessage,
			clearError,
			setPreviewItemsDirty,
			registerPostStatusSync,
		}),
		[
			runPersistTask,
			status,
			errorMessage,
			clearError,
			setPreviewItemsDirty,
			registerPostStatusSync,
		]
	);

	return (
		<TakeoverSaveStatusContext.Provider value={value}>
			{children}
		</TakeoverSaveStatusContext.Provider>
	);
}

/**
 * Hook for takeover save UI and wrapping async REST work.
 *
 * @return {Object} Save status and `runPersistTask` wrapper.
 */
export function useTakeoverSaveStatus() {
	const ctx = useContext(TakeoverSaveStatusContext);
	if (!ctx) {
		return {
			runPersistTask: async (fn) => {
				await fn();
			},
			status: /** @type {TakeoverSaveUiStatus} */ ('saved'),
			errorMessage: '',
			clearError: () => {},
			setPreviewItemsDirty: () => {},
			registerPostStatusSync: () => {},
		};
	}
	return ctx;
}
