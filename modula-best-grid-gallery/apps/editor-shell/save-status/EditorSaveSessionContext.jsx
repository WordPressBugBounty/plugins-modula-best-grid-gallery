/**
 * React binding of the editor save session (ADR 0059): one session per
 * mounted editor, the parts that register with it, the merged save state and
 * the leave confirmation. An editor opts in by mounting the provider; without
 * it the top bar shows no Save control and the save state is the write
 * queue's alone.
 */
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { EditorRecoveryCopyProvider } from '../recovery/EditorRecoveryCopy';
import { createEditorSaveSession } from './editorSaveSession';
import { mergeEditorSaveStatus } from './editorSaveStatusView';
import { useTakeoverSaveStatus } from './TakeoverSaveStatusContext';
import { useLeaveConfirmation } from './useLeaveConfirmation';

const EditorSaveSessionContext = createContext(null);

/** @typedef {import('../recovery/EditorRecoveryCopy').EditorRecoveryOptions} EditorRecoveryOptions */

/**
 * @param {Object}                    props
 * @param {string[]}                  props.order          Part keys in save order; read once, on mount.
 * @param {string[]}                  props.firstSaveOrder The same keys for a never-saved document; read once, on mount.
 * @param {() => boolean}             props.isFirstSave    Asked when a save starts; the latest one passed is used.
 * @param {EditorRecoveryOptions}     [props.recovery]     Opts in to the recovery copy (read once, on mount): parts registered with recovery callbacks are kept in this browser and offered on the next open (`EditorRecoveryNotice`).
 * @param {import('react').ReactNode} props.children
 */
export function EditorSaveSessionProvider({
	order,
	firstSaveOrder,
	isFirstSave,
	recovery = null,
	children,
}) {
	const isFirstSaveRef = useRef(isFirstSave);
	useLayoutEffect(() => {
		isFirstSaveRef.current = isFirstSave;
	}, [isFirstSave]);
	const [session] = useState(() =>
		createEditorSaveSession({
			order,
			firstSaveOrder,
			isFirstSave: () => isFirstSaveRef.current(),
		})
	);

	const [recoveryOptions] = useState(recovery);

	return (
		<EditorSaveSessionContext.Provider value={session}>
			<EditorLeaveGuard />
			{recoveryOptions ? (
				<EditorRecoveryCopyProvider
					session={session}
					recovery={recoveryOptions}
				>
					{children}
				</EditorRecoveryCopyProvider>
			) : (
				children
			)}
		</EditorSaveSessionContext.Provider>
	);
}

/**
 * Leaving the page (close, reload, the back link, any navigation) asks first
 * while a session part has unsaved changes, a running save included (its
 * parts stay unsaved until the response).
 */
function EditorLeaveGuard() {
	const session = useSessionSnapshot(useContext(EditorSaveSessionContext));
	useLeaveConfirmation(Boolean(session?.hasUnsavedChanges));
	return null;
}

/**
 * @param {Object|null} session
 * @return {{ status: string, hasUnsavedChanges: boolean, errorMessage: string }|null} Live session state.
 */
function useSessionSnapshot(session) {
	const subscribe = useCallback(
		(listener) => (session ? session.subscribe(listener) : () => {}),
		[session]
	);
	const status = useSyncExternalStore(subscribe, () =>
		session ? session.getStatus() : null
	);
	const hasUnsavedChanges = useSyncExternalStore(subscribe, () =>
		session ? session.hasUnsavedChanges() : false
	);
	const failure = status === 'error' ? session.getError() : null;
	const errorMessage = failure
		? String(failure.error?.message ?? failure.error)
		: '';
	return useMemo(
		() => (session ? { status, hasUnsavedChanges, errorMessage } : null),
		[session, status, hasUnsavedChanges, errorMessage]
	);
}

/**
 * The editor save session's state and actions, or null outside a provider.
 *
 * @return {{ status: string, hasUnsavedChanges: boolean, errorMessage: string, save: () => Promise<string>, retry: () => Promise<string>, isNeverSaved: () => boolean, ensureSaved: () => Promise<string> }|null} Session view; `save`, `retry` and `ensureSaved` never reject.
 */
export function useEditorSaveSession() {
	const session = useContext(EditorSaveSessionContext);
	const snapshot = useSessionSnapshot(session);
	return useMemo(
		() =>
			snapshot && {
				...snapshot,
				save: session.save,
				retry: session.retry,
				isNeverSaved: session.isNeverSaved,
				ensureSaved: session.ensureSaved,
			},
		[session, snapshot]
	);
}

/**
 * The save state the top bar shows: the session merged with the write queue
 * (`mergeEditorSaveStatus`). Outside a session provider it is the queue's.
 *
 * @return {import('./editorSaveStatusView').EditorSaveStatus} Status, error message and whether Retry applies.
 */
export function useEditorSaveStatus() {
	const queue = useTakeoverSaveStatus();
	const session = useSessionSnapshot(useContext(EditorSaveSessionContext));
	return mergeEditorSaveStatus(queue, session);
}

/**
 * Registers one part with the editor's save session for as long as the
 * calling component is mounted. The latest `hasUnsavedChanges` and `save`
 * passed are the ones the session calls. A successful `save` must make the
 * state it sent the part's baseline, so an edit made during the request keeps
 * `hasUnsavedChanges()` true.
 *
 * @param {Object}                      part
 * @param {string}                      part.key                       One of the provider's order keys.
 * @param {() => boolean}               part.hasUnsavedChanges
 * @param {() => Promise<void>}         part.save                      Rejects on failure.
 * @param {boolean}                     [part.saveOnFirstSave]         Saved in every first save, even without unsaved changes of its own.
 * @param {() => unknown}               [part.getRecoverySnapshot]     With `restoreRecoverySnapshot`, puts the part in the recovery copy: its unsaved state, JSON-serializable.
 * @param {(snapshot: unknown) => void} [part.restoreRecoverySnapshot] Applies that state through the part's normal change path (Restore); validates it first.
 * @return {() => void} Call when the part's unsaved changes may have changed.
 * @throws {Error} Outside an `EditorSaveSessionProvider`.
 */
export function useEditorSavePart({
	key,
	hasUnsavedChanges,
	save,
	saveOnFirstSave = false,
	getRecoverySnapshot,
	restoreRecoverySnapshot,
}) {
	const session = useContext(EditorSaveSessionContext);
	const latestRef = useRef({});
	// The latest callbacks for the session to call, kept out of render.
	useLayoutEffect(() => {
		latestRef.current = {
			hasUnsavedChanges,
			save,
			getRecoverySnapshot,
			restoreRecoverySnapshot,
		};
	});
	// Whether the part can be recovered is fixed for its registration.
	const isRecoverable =
		typeof getRecoverySnapshot === 'function' &&
		typeof restoreRecoverySnapshot === 'function';

	useEffect(() => {
		const part = {
			key,
			hasUnsavedChanges: () => latestRef.current.hasUnsavedChanges(),
			save: () => latestRef.current.save(),
			saveOnFirstSave,
		};
		if (isRecoverable) {
			part.getRecoverySnapshot = () =>
				latestRef.current.getRecoverySnapshot();
			part.restoreRecoverySnapshot = (snapshot) =>
				latestRef.current.restoreRecoverySnapshot(snapshot);
		}
		return session.registerPart(part);
	}, [session, key, saveOnFirstSave, isRecoverable]);

	// After every hook, so the hook order never depends on the provider.
	if (!session) {
		throw new Error(
			'useEditorSavePart must be used within EditorSaveSessionProvider'
		);
	}
	return session.notifyChange;
}
