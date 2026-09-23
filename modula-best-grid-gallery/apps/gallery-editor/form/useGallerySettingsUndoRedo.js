import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { describeSettingsChange } from '../utils/describeSettingsChange';
import { buildSettingsHistoryChange } from '../utils/galleryEditorHistoryPresentation';
import { applyGroupedSettingsToForm } from '../utils/applyGroupedSettingsToForm';
import { createGalleryEditorHistory } from '../utils/galleryEditorHistory';

const DEBOUNCE_MS = 400;
/**
 * After undo/redo, TanStack (or a sync effect) can briefly echo a non-current document
 * while `lastSnapshot` is already the restored one. Re-assert `lastSnapshot` for a short
 * window. Outside it, divergences are real edits and commit normally.
 */
const GHOST_ECHO_MS = 200;

/**
 * @param {import('@tanstack/react-form').ReactFormApi<any>}                                        form
 * @param {(v: Record<string, Record<string, unknown>>) => Record<string, Record<string, unknown>>} cloneGroupedSettings
 */
export function useGallerySettingsUndoRedo(form, cloneGroupedSettings) {
	const canonicalSerialize = useCallback(
		(values) => JSON.stringify(cloneGroupedSettings(values ?? {})),
		[cloneGroupedSettings]
	);

	const historyRef = useRef(null);
	if (historyRef.current === null) {
		historyRef.current = createGalleryEditorHistory({
			initialSettings: cloneGroupedSettings(form.store.state.values),
		});
	}

	const lastSnapshotRef = useRef(
		cloneGroupedSettings(form.store.state.values)
	);
	const debounceTimerRef = useRef(
		/** @type {ReturnType<typeof setTimeout>|null} */ (null)
	);
	const pendingSerializedRef = useRef(
		canonicalSerialize(form.store.state.values)
	);
	const ghostEchoUntilRef = useRef(0);
	/** @type {import('react').MutableRefObject<((layout: Record<string, unknown>) => void)|null>} */
	const layoutApplierRef = useRef(null);
	const [stackVersion, setStackVersion] = useState(0);

	const bump = useCallback(() => {
		setStackVersion((v) => v + 1);
	}, []);

	const armGhostEchoWindow = useCallback(() => {
		ghostEchoUntilRef.current = Date.now() + GHOST_ECHO_MS;
	}, []);

	const isInGhostEchoWindow = useCallback(
		() => Date.now() < ghostEchoUntilRef.current,
		[]
	);

	const applyDocument = useCallback(
		(doc) => applyGroupedSettingsToForm(form, doc, cloneGroupedSettings),
		[form, cloneGroupedSettings]
	);

	const subscribeForm = useCallback(
		(onChange) => form.store.subscribe(onChange),
		[form]
	);
	const getSerializedSnapshot = useCallback(
		() => canonicalSerialize(form.store.state.values),
		[form, canonicalSerialize]
	);

	const serialized = useSyncExternalStore(
		subscribeForm,
		getSerializedSnapshot,
		getSerializedSnapshot
	);

	const clearDebounce = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
	}, []);

	/**
	 * @param {{ settings: Record<string, Record<string, unknown>> }} snap
	 */
	const applySettingsSnapshot = useCallback(
		(snap) => {
			const applied = applyDocument(
				cloneGroupedSettings(snap.settings ?? {})
			);
			lastSnapshotRef.current = applied;
			pendingSerializedRef.current = canonicalSerialize(applied);
			return applied;
		},
		[applyDocument, canonicalSerialize, cloneGroupedSettings]
	);

	/**
	 * Full reset: new document from server (refetch / replace). Clears undo/redo stacks.
	 * Optional `values` avoids reading TanStack store one tick behind `form.reset`.
	 *
	 * @param {Record<string, Record<string, unknown>>} [values]
	 */
	const syncCheckpointFromForm = useCallback(
		(values) => {
			const source =
				values !== undefined ? values : form.store.state.values;
			const next = cloneGroupedSettings(source);
			historyRef.current.syncCheckpoint({ settings: next });
			lastSnapshotRef.current = next;
			pendingSerializedRef.current = canonicalSerialize(source);
			clearDebounce();
			bump();
		},
		[form, cloneGroupedSettings, bump, canonicalSerialize, clearDebounce]
	);

	/**
	 * @param {Record<string, Record<string, unknown>>} [values]
	 */
	const adoptCheckpointFromForm = useCallback(
		(values) => {
			const source =
				values !== undefined ? values : form.store.state.values;
			const next = cloneGroupedSettings(source);
			historyRef.current.adoptCheckpoint({ settings: next });
			lastSnapshotRef.current = next;
			pendingSerializedRef.current = canonicalSerialize(source);
			clearDebounce();
			bump();
		},
		[form, cloneGroupedSettings, bump, canonicalSerialize, clearDebounce]
	);

	useEffect(() => {
		const ser = serialized;
		const liveCanonical = canonicalSerialize(form.store.state.values);
		const lastCanonical = canonicalSerialize(lastSnapshotRef.current);

		if (liveCanonical === lastCanonical) {
			clearDebounce();
			pendingSerializedRef.current = liveCanonical;
			return undefined;
		}

		// Right after undo/redo: any divergence is treated as echo of the previous doc.
		if (isInGhostEchoWindow()) {
			clearDebounce();
			const restored = applyDocument(lastSnapshotRef.current);
			pendingSerializedRef.current = canonicalSerialize(restored);
			return undefined;
		}

		if (pendingSerializedRef.current === ser) {
			return undefined;
		}

		pendingSerializedRef.current = ser;
		clearDebounce();

		debounceTimerRef.current = window.setTimeout(() => {
			debounceTimerRef.current = null;
			const values = form.store.state.values;
			const snapSerCanon = canonicalSerialize(values);
			const lastSerCanon = canonicalSerialize(lastSnapshotRef.current);
			if (snapSerCanon === lastSerCanon) {
				return;
			}
			if (isInGhostEchoWindow()) {
				const restored = applyDocument(lastSnapshotRef.current);
				pendingSerializedRef.current = canonicalSerialize(restored);
				return;
			}
			const previous = lastSnapshotRef.current;
			const next = cloneGroupedSettings(values);
			const stepLabel = describeSettingsChange(previous, next);
			historyRef.current.commitSettingsStep({
				label: stepLabel,
				settings: next,
				change: buildSettingsHistoryChange(previous, next),
			});
			lastSnapshotRef.current = next;
			pendingSerializedRef.current = snapSerCanon;
			bump();
		}, DEBOUNCE_MS);

		return () => {
			clearDebounce();
		};
	}, [
		serialized,
		form,
		cloneGroupedSettings,
		bump,
		canonicalSerialize,
		isInGhostEchoWindow,
		applyDocument,
		clearDebounce,
	]);

	/**
	 * Preview host registers how to apply a layout slice to the catalog + persist.
	 *
	 * @param {((layout: Record<string, unknown>) => void)|null} applyLayout
	 * @return {() => void} Unsubscribe.
	 */
	const registerLayoutApplier = useCallback((applyLayout) => {
		layoutApplierRef.current =
			typeof applyLayout === 'function' ? applyLayout : null;
		return () => {
			if (layoutApplierRef.current === applyLayout) {
				layoutApplierRef.current = null;
			}
		};
	}, []);

	const applyLayoutSnapshot = useCallback((layout) => {
		layoutApplierRef.current?.(layout);
	}, []);

	const undo = useCallback(() => {
		clearDebounce();
		const snap = historyRef.current.undo();
		if (!snap) {
			return;
		}
		armGhostEchoWindow();
		if (snap.type === 'settings') {
			applySettingsSnapshot(snap);
		} else if (snap.type === 'layout') {
			applyLayoutSnapshot(snap.layout);
		}
		bump();
	}, [
		bump,
		armGhostEchoWindow,
		applySettingsSnapshot,
		applyLayoutSnapshot,
		clearDebounce,
	]);

	const redo = useCallback(() => {
		clearDebounce();
		const snap = historyRef.current.redo();
		if (!snap) {
			return;
		}
		armGhostEchoWindow();
		if (snap.type === 'settings') {
			applySettingsSnapshot(snap);
		} else if (snap.type === 'layout') {
			applyLayoutSnapshot(snap.layout);
		}
		bump();
	}, [
		bump,
		armGhostEchoWindow,
		applySettingsSnapshot,
		applyLayoutSnapshot,
		clearDebounce,
	]);

	/**
	 * Restore the snapshot at `index` and truncate every step after it.
	 *
	 * @param {number} index
	 */
	const jumpTo = useCallback(
		(index) => {
			clearDebounce();
			const snap = historyRef.current.jumpTo(index);
			if (!snap) {
				return null;
			}
			armGhostEchoWindow();
			applySettingsSnapshot(snap);
			applyLayoutSnapshot(snap.layout);
			bump();
			return snap;
		},
		[
			bump,
			armGhostEchoWindow,
			applySettingsSnapshot,
			applyLayoutSnapshot,
			clearDebounce,
		]
	);

	/**
	 * @param {{ label: string, layout: Record<string, unknown> }} args
	 */
	const commitLayoutStep = useCallback(
		(args) => {
			if (historyRef.current.commitLayoutStep(args) === false) {
				return;
			}
			bump();
		},
		[bump]
	);

	/**
	 * @param {Record<string, unknown>|null|undefined} layout
	 */
	const adoptLayoutCheckpoint = useCallback((layout) => {
		historyRef.current.adoptLayoutCheckpoint(layout);
	}, []);

	const dropLayoutSteps = useCallback(() => {
		historyRef.current.dropLayoutSteps();
		bump();
	}, [bump]);

	const clearHistory = useCallback(() => {
		clearDebounce();
		historyRef.current.clear();
		bump();
	}, [bump, clearDebounce]);

	return useMemo(() => {
		const history = historyRef.current;
		return {
			undo,
			redo,
			canUndo: history.canUndo(),
			canRedo: history.canRedo(),
			undoableCount: history.undoableCount(),
			lastStepLabel: history.lastStepLabel(),
			undoStepLabel: history.undoStepLabel(),
			redoStepLabel: history.redoStepLabel(),
			syncCheckpointFromForm,
			adoptCheckpointFromForm,
			stackVersion,
			historyEntries: history.listEntries(),
			jumpTo,
			clearHistory,
			commitLayoutStep,
			adoptLayoutCheckpoint,
			dropLayoutSteps,
			registerLayoutApplier,
		};
	}, [
		undo,
		redo,
		syncCheckpointFromForm,
		adoptCheckpointFromForm,
		stackVersion,
		jumpTo,
		clearHistory,
		commitLayoutStep,
		adoptLayoutCheckpoint,
		dropLayoutSteps,
		registerLayoutApplier,
	]);
}
