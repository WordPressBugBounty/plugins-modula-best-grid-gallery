import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { describeSettingsChange } from '../utils/describeSettingsChange';
import { applyGroupedSettingsToForm } from '../utils/applyGroupedSettingsToForm';

const DEBOUNCE_MS = 400;
const MAX_PAST = 50;
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

	const pastRef = useRef(
		/** @type {Record<string, Record<string, unknown>>[]} */ ([])
	);
	const futureRef = useRef(
		/** @type {Record<string, Record<string, unknown>>[]} */ ([])
	);
	const pastLabelsRef = useRef(/** @type {string[]} */ ([]));
	const futureLabelsRef = useRef(/** @type {string[]} */ ([]));
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
			pastRef.current = [];
			futureRef.current = [];
			pastLabelsRef.current = [];
			futureLabelsRef.current = [];
			lastSnapshotRef.current = cloneGroupedSettings(source);
			pendingSerializedRef.current = canonicalSerialize(source);
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			bump();
		},
		[form, cloneGroupedSettings, bump, canonicalSerialize]
	);

	/**
	 * @param {Record<string, Record<string, unknown>>} [values]
	 */
	const adoptCheckpointFromForm = useCallback(
		(values) => {
			const source =
				values !== undefined ? values : form.store.state.values;
			lastSnapshotRef.current = cloneGroupedSettings(source);
			pendingSerializedRef.current = canonicalSerialize(source);
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			bump();
		},
		[form, cloneGroupedSettings, bump, canonicalSerialize]
	);

	useEffect(() => {
		const ser = serialized;
		const liveCanonical = canonicalSerialize(form.store.state.values);
		const lastCanonical = canonicalSerialize(lastSnapshotRef.current);

		if (liveCanonical === lastCanonical) {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			pendingSerializedRef.current = liveCanonical;
			return undefined;
		}

		// Right after undo/redo: any divergence is treated as echo of the previous doc.
		if (isInGhostEchoWindow()) {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
			const restored = applyDocument(lastSnapshotRef.current);
			pendingSerializedRef.current = canonicalSerialize(restored);
			return undefined;
		}

		if (pendingSerializedRef.current === ser) {
			return undefined;
		}

		pendingSerializedRef.current = ser;

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

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
			pastRef.current.push(cloneGroupedSettings(previous));
			pastLabelsRef.current.push(stepLabel);
			if (pastRef.current.length > MAX_PAST) {
				pastRef.current.shift();
				pastLabelsRef.current.shift();
			}
			futureRef.current = [];
			futureLabelsRef.current = [];
			lastSnapshotRef.current = next;
			pendingSerializedRef.current = snapSerCanon;
			bump();
		}, DEBOUNCE_MS);

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
				debounceTimerRef.current = null;
			}
		};
	}, [
		serialized,
		form,
		cloneGroupedSettings,
		bump,
		canonicalSerialize,
		isInGhostEchoWindow,
		applyDocument,
	]);

	const undo = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		if (pastRef.current.length === 0) {
			return;
		}
		const target = pastRef.current.pop();
		if (!target) {
			return;
		}
		/*
		 * Push the committed current document (`lastSnapshot`), not `form.store.state.values`.
		 * The store can lag the Field UI / committed checkpoint; capturing it polluted `future`
		 * and made redo appear to no-op (reset target already matched the stale store).
		 */
		const currentDoc = cloneGroupedSettings(lastSnapshotRef.current);
		const stepLabel = pastLabelsRef.current.pop() || '';
		futureRef.current.push(currentDoc);
		futureLabelsRef.current.push(stepLabel);
		armGhostEchoWindow();
		const applied = applyDocument(target);
		lastSnapshotRef.current = applied;
		pendingSerializedRef.current = canonicalSerialize(applied);
		bump();
	}, [
		cloneGroupedSettings,
		bump,
		canonicalSerialize,
		armGhostEchoWindow,
		applyDocument,
	]);

	const redo = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		if (futureRef.current.length === 0) {
			return;
		}
		const target = futureRef.current.pop();
		if (!target) {
			return;
		}
		const currentDoc = cloneGroupedSettings(lastSnapshotRef.current);
		const stepLabel = futureLabelsRef.current.pop() || '';
		pastRef.current.push(currentDoc);
		pastLabelsRef.current.push(stepLabel);
		if (pastRef.current.length > MAX_PAST) {
			pastRef.current.shift();
			pastLabelsRef.current.shift();
		}
		armGhostEchoWindow();
		const applied = applyDocument(target);
		lastSnapshotRef.current = applied;
		pendingSerializedRef.current = canonicalSerialize(applied);
		bump();
	}, [
		cloneGroupedSettings,
		bump,
		canonicalSerialize,
		armGhostEchoWindow,
		applyDocument,
	]);

	const canUndo = pastRef.current.length > 0;
	const canRedo = futureRef.current.length > 0;
	const undoStepLabel = pastLabelsRef.current.at(-1) || '';
	const redoStepLabel = futureLabelsRef.current.at(-1) || '';
	const lastStepLabel = undoStepLabel;

	return useMemo(
		() => ({
			undo,
			redo,
			canUndo,
			canRedo,
			lastStepLabel,
			undoStepLabel,
			redoStepLabel,
			syncCheckpointFromForm,
			adoptCheckpointFromForm,
			stackVersion,
		}),
		[
			undo,
			redo,
			canUndo,
			canRedo,
			lastStepLabel,
			undoStepLabel,
			redoStepLabel,
			syncCheckpointFromForm,
			adoptCheckpointFromForm,
			stackVersion,
		]
	);
}
