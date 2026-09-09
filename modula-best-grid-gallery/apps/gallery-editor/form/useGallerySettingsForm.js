import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { useForm } from '@tanstack/react-form';
import { usePatchGallerySettingsV2Mutation } from '../query/usePatchGallerySettingsV2Mutation';
import { buildPatchPayload } from '../logic/buildPatchPayload';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';
import { collectPatchValidationErrors } from '../logic/collectPatchValidationErrors';
import { useGallerySettingsUndoRedo } from './useGallerySettingsUndoRedo';

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
			await patchMutation.mutateAsync(patch);
		},
	});

	const undoRedo = useGallerySettingsUndoRedo(form, cloneGroupedSettings);

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
	};
}
