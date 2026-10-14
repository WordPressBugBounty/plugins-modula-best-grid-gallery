import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { stripRestPostMeta } from 'editor-shell/logic';
import { useForm } from '@tanstack/react-form';
import { usePatchGallerySettingsV2Mutation } from '../query/usePatchGallerySettingsV2Mutation';
import { buildPatchPayload } from '../logic/buildPatchPayload';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';
import { collectPatchValidationErrors } from '../logic/collectPatchValidationErrors';
import { useGallerySettingsUndoRedo } from './useGallerySettingsUndoRedo';
import { applyGroupedSettingsToForm } from '../utils/applyGroupedSettingsToForm';

export function cloneGroupedSettings(data) {
	return data ? JSON.parse(JSON.stringify(data)) : {};
}

/**
 * Stable string for comparing server / bootstrap payloads and `lastServerSerializedRef`.
 * Use everywhere that assigns or compares that ref (autosave, type confirm, this hook).
 *
 * @param {Record<string, Record<string, unknown>>} grouped
 * @return {string}
 */
export function serializeGroupedForServerRef(grouped) {
	const next = cloneGroupedSettings(grouped);
	normalizeGroupedDefaults(next);
	return JSON.stringify(next);
}

/**
 * TanStack Form over grouped v2 settings; PATCH minimal diff vs server baseline.
 *
 * @param {Record<string, Record<string, unknown>>} groupedPayload Initial / server data.
 * @param {number}                                  galleryId      Post ID.
 */
export function useGallerySettingsForm(groupedPayload, galleryId) {
	const initial = cloneGroupedSettings(groupedPayload);
	normalizeGroupedDefaults(initial);
	const baselineRef = useRef(initial);
	const lastServerSerializedRef = useRef('');
	const patchMutation = usePatchGallerySettingsV2Mutation(galleryId);
	const [clientError, setClientError] = useState('');
	const activeGestureRef = useRef(false);
	const deferredAcknowledgementRef = useRef(null);
	const applyAcknowledgementRef = useRef(null);

	const form = useForm({
		defaultValues: initial,
		onSubmit: async ({ value }) => {
			setClientError('');
			const patch = buildPatchPayload(value, baselineRef.current);
			if (Object.keys(patch).length === 0) {
				return;
			}
			const clientErrors = collectPatchValidationErrors(patch, value);
			if (clientErrors.length > 0) {
				setClientError(clientErrors.join('\n'));
				return;
			}
			const snapshot = cloneGroupedSettings(value);
			const serverData = await patchMutation.mutateAsync(patch);
			acknowledgeSettingsSave(snapshot, serverData);
		},
	});

	const undoRedo = useGallerySettingsUndoRedo(form, cloneGroupedSettings);

	const applyAcknowledgement = useCallback(
		({ snapshot, normalized }) => {
			const current = form.store.state.values;
			const newerEdits = buildPatchPayload(current, snapshot);
			const next = cloneGroupedSettings(normalized);
			for (const [group, fields] of Object.entries(newerEdits)) {
				next[group] = { ...next[group], ...fields };
			}
			if (
				serializeGroupedForServerRef(next) ===
				serializeGroupedForServerRef(current)
			) {
				return;
			}
			// Adopt normalization without replacing newer edits or creating an authored history step.
			undoRedo.reconcileSettingsCheckpoint(() =>
				applyGroupedSettingsToForm(form, next, cloneGroupedSettings)
			);
		},
		[form, undoRedo]
	);
	applyAcknowledgementRef.current = applyAcknowledgement;

	const acknowledgeSettingsSave = useCallback((snapshot, serverData) => {
		const normalized = cloneGroupedSettings(stripRestPostMeta(serverData));
		normalizeGroupedDefaults(normalized);
		baselineRef.current = normalized;
		lastServerSerializedRef.current =
			serializeGroupedForServerRef(normalized);
		const acknowledgement = {
			snapshot: cloneGroupedSettings(snapshot),
			normalized,
		};
		if (activeGestureRef.current) {
			// Server validation is acknowledged now; form normalization waits for pointer completion/cancel.
			deferredAcknowledgementRef.current = acknowledgement;
			return;
		}
		applyAcknowledgementRef.current(acknowledgement);
	}, []);

	const beginSettingsGesture = useCallback(() => {
		activeGestureRef.current = true;
		return () => {
			activeGestureRef.current = false;
			const acknowledgement = deferredAcknowledgementRef.current;
			deferredAcknowledgementRef.current = null;
			if (acknowledgement) {
				applyAcknowledgementRef.current(acknowledgement);
			}
		};
	}, []);

	const getPendingSettingsPatch = useCallback(
		(values = form.store.state.values) => {
			// Deferred normalization is confirmed work, not another edit to autosave mid-gesture.
			const comparison =
				deferredAcknowledgementRef.current?.snapshot ??
				baselineRef.current;
			return buildPatchPayload(values, comparison);
		},
		[form]
	);

	const formApiRef = useRef(form);
	formApiRef.current = form;

	const adoptCheckpointRef = useRef(undoRedo.adoptCheckpointFromForm);
	adoptCheckpointRef.current = undoRedo.adoptCheckpointFromForm;

	const groupedPayloadSignature = useMemo(
		() => serializeGroupedForServerRef(groupedPayload),
		[groupedPayload]
	);

	useEffect(() => {
		if (groupedPayloadSignature === lastServerSerializedRef.current) {
			return;
		}
		const pendingPatch = buildPatchPayload(
			formApiRef.current.state.values,
			baselineRef.current
		);
		if (Object.keys(pendingPatch).length > 0) {
			return;
		}
		lastServerSerializedRef.current = groupedPayloadSignature;
		const next = cloneGroupedSettings(groupedPayload);
		normalizeGroupedDefaults(next);
		baselineRef.current = next;
		setClientError('');
		formApiRef.current.reset(next);
		/*
		 * Keep undo/redo stacks. This effect often runs on our own PATCH echo via React
		 * Query; `syncCheckpointFromForm` would wipe history and make Undo look dead.
		 */
		adoptCheckpointRef.current(next);
	}, [groupedPayloadSignature, groupedPayload]);

	return {
		form,
		patchMutation,
		clientError,
		setClientError,
		baselineRef,
		lastServerSerializedRef,
		undoRedo,
		acknowledgeSettingsSave,
		beginSettingsGesture,
		getPendingSettingsPatch,
	};
}
