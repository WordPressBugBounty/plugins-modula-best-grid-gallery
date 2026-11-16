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
import { adoptDerivedSettings } from '../logic/adoptDerivedSettings';
import {
	cloneSettingValue,
	groupedSettingsFields,
	hasSettingsField,
} from '../logic/groupedSettingsFields';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';
import { collectPatchValidationErrors } from '../logic/collectPatchValidationErrors';
import { useGallerySettingsUndoRedo } from './useGallerySettingsUndoRedo';
import { applyGroupedSettingsToForm } from '../utils/applyGroupedSettingsToForm';

export function cloneGroupedSettings(data) {
	return data ? JSON.parse(JSON.stringify(data)) : {};
}

/**
 * Stable string for comparing server / bootstrap payloads and `lastServerSerializedRef`.
 * Use everywhere that assigns or compares that ref (defaults apply, this hook).
 *
 * @param {Record<string, Record<string, unknown>>} grouped
 * @return {string} Normalized JSON of the grouped settings.
 */
export function serializeGroupedForServerRef(grouped) {
	const next = cloneGroupedSettings(grouped);
	normalizeGroupedDefaults(next);
	return JSON.stringify(next);
}

/**
 * @param {Record<string, Record<string, unknown>>} saved Saved settings (not modified).
 * @param {string}                                  group
 * @param {string}                                  key
 * @param {unknown}                                 value The value now stored.
 * @return {Record<string, Record<string, unknown>>} Saved settings with that value.
 */
function adoptStoredValue(saved, group, key, value) {
	return {
		...saved,
		[group]: { ...saved?.[group], [key]: cloneSettingValue(value) },
	};
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

	// No `onSubmit`: settings are stored only by `saveSettings`, the editor save's settings part.
	const form = useForm({ defaultValues: initial });

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

	/*
	 * The diff is asked for on every change (the save session, the recovery
	 * copy, Freeform reconciles): compute it once per form state. Form values
	 * and the baseline are replaced, never mutated, so identity is the key.
	 * Callers must not mutate the returned patch.
	 */
	const pendingPatchCacheRef = useRef(null);
	const getPendingSettingsPatch = useCallback(
		(values = form.store.state.values) => {
			// Deferred normalization is confirmed work, not another edit mid-gesture.
			const comparison =
				deferredAcknowledgementRef.current?.snapshot ??
				baselineRef.current;
			const cached = pendingPatchCacheRef.current;
			if (cached?.values === values && cached.comparison === comparison) {
				return cached.patch;
			}
			const patch = buildPatchPayload(values, comparison);
			pendingPatchCacheRef.current = { values, comparison, patch };
			return patch;
		},
		[form]
	);

	/**
	 * Apply a settings change derived from the stored state rather than made
	 * by the author (e.g. Freeform placements reconciled with the catalog on
	 * open). It is not an unsaved change and not an undo step: opening a
	 * gallery never leaves unsaved changes. See `adoptDerivedSettings`.
	 * The saved value is adopted before the form changes, so the change
	 * notification already reports the final unsaved state.
	 *
	 * @param {string}  name  Grouped field name, `group.key`.
	 * @param {unknown} value The derived value.
	 */
	const reconcileDerivedSettings = useCallback(
		(name, value) => {
			const [group, key, ...rest] = String(name).split('.');
			if (!group || !key || rest.length > 0) {
				return;
			}
			const derived = { [group]: { [key]: value } };
			const unsaved = getPendingSettingsPatch();
			baselineRef.current = adoptDerivedSettings(
				baselineRef.current,
				derived,
				unsaved
			);
			const deferred = deferredAcknowledgementRef.current;
			if (deferred) {
				deferred.snapshot = adoptDerivedSettings(
					deferred.snapshot,
					derived,
					unsaved
				);
			}
			undoRedo.reconcileSettingsCheckpoint(() =>
				form.setFieldValue(name, value)
			);
		},
		[form, getPendingSettingsPatch, undoRedo]
	);

	const storedWriteListenersRef = useRef(new Set());

	/**
	 * Settings an immediate action stored outside the editor save (e.g. the Pro
	 * proofing lock) become saved state: each is the saved value now. A field
	 * without unsaved changes takes it in the form too (no history step); a
	 * field with unsaved changes keeps its working value, compared with the
	 * stored one. The write's response goes to `subscribeStoredWrites`
	 * listeners (the settings part reports its saved-state marker).
	 *
	 * @param {Record<string, Record<string, unknown>>} stored     Fields the action stored, grouped.
	 * @param {unknown}                                 [response] The action's REST response.
	 */
	const adoptStoredSettings = useCallback(
		(stored, response) => {
			const unsaved = getPendingSettingsPatch();
			const deferred = deferredAcknowledgementRef.current;
			const fields = groupedSettingsFields(stored);
			for (const { group, key, value } of fields) {
				baselineRef.current = adoptStoredValue(
					baselineRef.current,
					group,
					key,
					value
				);
				if (deferred) {
					deferred.snapshot = adoptStoredValue(
						deferred.snapshot,
						group,
						key,
						value
					);
				}
			}
			const fieldsWithoutUnsavedChanges = fields.filter(
				({ group, key }) => !hasSettingsField(unsaved, group, key)
			);
			undoRedo.reconcileSettingsCheckpoint(() => {
				for (const { name, value } of fieldsWithoutUnsavedChanges) {
					form.setFieldValue(name, value);
				}
			});
			for (const listener of storedWriteListenersRef.current) {
				listener(response);
			}
		},
		[form, getPendingSettingsPatch, undoRedo]
	);

	/**
	 * @param {(response: unknown) => void} listener Hears each `adoptStoredSettings` call.
	 * @return {() => void} Unsubscribes.
	 */
	const subscribeStoredWrites = useCallback((listener) => {
		const listeners = storedWriteListenersRef.current;
		listeners.add(listener);
		return () => listeners.delete(listener);
	}, []);

	/**
	 * PATCH the settings that differ from the saved baseline. The values sent
	 * become the baseline (normalized by the server), so an edit made while the
	 * request is open stays an unsaved change.
	 *
	 * @return {Promise<Object|undefined>} The PATCH response (stored settings with `postStatus` and `savedState`), undefined when nothing was sent. Rejects when the change is invalid or the request fails.
	 */
	const saveSettings = useCallback(async () => {
		const values = cloneGroupedSettings(form.store.state.values);
		const patch = getPendingSettingsPatch(values);
		if (Object.keys(patch).length === 0) {
			return undefined;
		}
		const clientErrors = collectPatchValidationErrors(patch, values);
		if (clientErrors.length > 0) {
			setClientError(clientErrors.join('\n'));
			throw new Error(clientErrors[0]);
		}
		setClientError('');
		const serverData = await patchMutation.mutateAsync(patch);
		acknowledgeSettingsSave(values, serverData);
		return serverData;
	}, [form, getPendingSettingsPatch, patchMutation, acknowledgeSettingsSave]);

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
		reconcileDerivedSettings,
		adoptStoredSettings,
		subscribeStoredWrites,
		saveSettings,
	};
}
