import {
	asGalleryItemList,
	markCustomGridRepackAfterGalleryTypeChange,
} from 'gallery-shared/preview';
import { useCallback, useRef, useState } from '@wordpress/element';
import { useQueryClient } from '@tanstack/react-query';
import {
	cloneGroupedSettings,
	serializeGroupedForServerRef,
} from '../form/useGallerySettingsForm';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { useTakeoverSaveStatus } from '../context/TakeoverSaveStatusContext';
import { buildPatchPayload } from '../logic/buildPatchPayload';
import { collectPatchValidationErrors } from '../logic/collectPatchValidationErrors';
import { getGalleryBootstrapQueryKey } from '../query/useGalleryBootstrapQuery';
import { clearAllGalleryImageFocus } from '../utils/clearAllGalleryImageFocus';
import { itemHasImageFocusData } from '../utils/itemHasImageFocus';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import { stripRestPostMeta } from '../utils/applyRestPostStatus';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';
import { applyGalleryTypeSideEffects } from '../logic/applyGalleryTypeSideEffects';

/**
 * Modal + PATCH flow when changing `general.type` while slide/image focus data exists.
 *
 * @param {string} groupedPath Field `groupedPath` from schema (e.g. `layout.gutter`).
 * @return {Object} `makeOnChange`, modal open/busy flags, cancel/confirm handlers, and `isGalleryTypeField`.
 */
export function useGalleryTypeChangeConfirm(groupedPath) {
	const {
		form,
		patchMutation,
		baselineRef,
		lastServerSerializedRef,
		setClientError,
		undoRedo,
	} = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const queryClient = useQueryClient();

	const isGalleryTypeField = groupedPath === 'general.type';

	const pendingGalleryTypeRef = useRef(null);
	const [galleryTypeConfirmOpen, setGalleryTypeConfirmOpen] = useState(false);
	const [galleryTypeConfirmBusy, setGalleryTypeConfirmBusy] = useState(false);

	const handleGalleryTypeConfirmCancel = useCallback(() => {
		if (galleryTypeConfirmBusy) {
			return;
		}
		const pending = pendingGalleryTypeRef.current;
		if (pending?.fieldApi && pending.prevValue !== undefined) {
			form.setFieldValue('general.type', pending.prevValue);
		}
		setGalleryTypeConfirmOpen(false);
		pendingGalleryTypeRef.current = null;
	}, [galleryTypeConfirmBusy, form]);

	const handleGalleryTypeConfirm = useCallback(async () => {
		const pending = pendingGalleryTypeRef.current;
		if (!pending) {
			return;
		}
		const { fieldApi, nextValue } = pending;
		const gid = getModulaSettingsEditorConfig().galleryId;
		const previewStore = getGalleryPreviewReduxStore();
		if (!gid || !previewStore) {
			fieldApi.handleChange(nextValue);
			setGalleryTypeConfirmOpen(false);
			pendingGalleryTypeRef.current = null;
			return;
		}
		setGalleryTypeConfirmBusy(true);
		try {
			await runPersistTask(async () => {
				await clearAllGalleryImageFocus({
					galleryId: gid,
					store: previewStore,
				});
				fieldApi.handleChange(nextValue);
				applyGalleryTypeSideEffects(form, pending.prevValue, nextValue);
				markCustomGridRepackAfterGalleryTypeChange(
					pending.prevValue,
					nextValue,
					previewStore.getState()?.items?.items
				);
				const v = cloneGroupedSettings(form.state.values);
				if (!v.general || typeof v.general !== 'object') {
					v.general = {};
				}
				v.general = { ...v.general, type: nextValue };
				const patch = buildPatchPayload(v, baselineRef.current);
				if (Object.keys(patch).length > 0) {
					const errs = collectPatchValidationErrors(patch, v);
					if (errs.length > 0) {
						setClientError(errs.join('\n'));
						throw new Error(errs[0]);
					}
					setClientError('');
					const serverData = await patchMutation.mutateAsync(patch);
					const normalized = cloneGroupedSettings(
						stripRestPostMeta(serverData)
					);
					normalizeGroupedDefaults(normalized);
					baselineRef.current = normalized;
					lastServerSerializedRef.current =
						serializeGroupedForServerRef(normalized);
					const snapshot = cloneGroupedSettings(v);
					const current = form.state.values;
					const snapshotMatch =
						JSON.stringify(snapshot) === JSON.stringify(current);
					if (snapshotMatch) {
						form.reset(normalized);
						undoRedo.adoptCheckpointFromForm();
					}
					// If user changed form while this async confirm+save flow was
					// in-flight, keep live state untouched. Resetting with a captured
					// `current` snapshot can race with undo/redo and restore stale type.
				}
			});
			await queryClient.refetchQueries({
				queryKey: getGalleryBootstrapQueryKey(gid),
			});
			setGalleryTypeConfirmOpen(false);
			pendingGalleryTypeRef.current = null;
		} catch (e) {
			const pendingErr = pendingGalleryTypeRef.current;
			if (pendingErr?.fieldApi && pendingErr.prevValue !== undefined) {
				form.setFieldValue('general.type', pendingErr.prevValue);
			}
			// eslint-disable-next-line no-console
			console.error(e);
		} finally {
			setGalleryTypeConfirmBusy(false);
		}
	}, [
		runPersistTask,
		queryClient,
		form,
		patchMutation,
		baselineRef,
		lastServerSerializedRef,
		setClientError,
		undoRedo,
	]);

	const makeOnChange = useCallback(
		(fieldApi) => {
			return (v) => {
				if (!isGalleryTypeField) {
					fieldApi.handleChange(v);
					return;
				}
				const prev = fieldApi.state.value;
				if (String(v ?? '') === String(prev ?? '')) {
					return;
				}
				const previewStore = getGalleryPreviewReduxStore();
				const items = previewStore?.getState()?.items?.items;
				const hasFocus =
					Array.isArray(items) &&
					asGalleryItemList(items).some((row) =>
						itemHasImageFocusData(row)
					);
				if (!hasFocus) {
					form.setFieldValue('general.type', v);
					applyGalleryTypeSideEffects(form, prev, v);
					markCustomGridRepackAfterGalleryTypeChange(prev, v, items);
					return;
				}
				pendingGalleryTypeRef.current = {
					fieldApi,
					nextValue: v,
					prevValue: prev,
				};
				form.setFieldValue('general.type', v);
				setGalleryTypeConfirmOpen(true);
			};
		},
		[isGalleryTypeField, form]
	);

	return {
		makeOnChange,
		galleryTypeConfirmOpen,
		galleryTypeConfirmBusy,
		handleGalleryTypeConfirmCancel,
		handleGalleryTypeConfirm,
		isGalleryTypeField,
	};
}
