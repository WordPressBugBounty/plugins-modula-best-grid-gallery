import {
	asGalleryItemList,
	markCustomGridRepackAfterGalleryTypeChange,
} from 'gallery-shared/preview';
import { useCallback, useRef, useState } from '@wordpress/element';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { clearAllGalleryImageFocus } from '../utils/clearAllGalleryImageFocus';
import { itemHasImageFocusData } from '../utils/itemHasImageFocus';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';
import { applyGalleryTypeSideEffects } from '../logic/applyGalleryTypeSideEffects';
import { dropGalleryEditorLayoutStepsIfNeeded } from '../utils/galleryEditorLayoutHistoryHygiene';

/**
 * Confirmation flow when changing `general.type` while slide/image focus data
 * exists: confirming clears the focus, then changes the type in the form.
 *
 * @param {string} groupedPath Field `groupedPath` from schema (e.g. `layout.gutter`).
 * @return {Object} `makeOnChange`, modal open/busy flags, cancel/confirm handlers, and `isGalleryTypeField`.
 */
export function useGalleryTypeChangeConfirm(groupedPath) {
	const { form, undoRedo } = useGallerySettingsFormBundle();

	const isGalleryTypeField = groupedPath === 'general.type';

	const pendingGalleryTypeRef = useRef(null);
	const [galleryTypeConfirmOpen, setGalleryTypeConfirmOpen] = useState(false);

	const handleGalleryTypeConfirmCancel = useCallback(() => {
		const pending = pendingGalleryTypeRef.current;
		if (pending?.fieldApi && pending.prevValue !== undefined) {
			form.setFieldValue('general.type', pending.prevValue);
		}
		setGalleryTypeConfirmOpen(false);
		pendingGalleryTypeRef.current = null;
	}, [form]);

	// The focus clear and the type change are unsaved changes until the
	// editor save stores them (ADR 0059).
	const handleGalleryTypeConfirm = useCallback(() => {
		const pending = pendingGalleryTypeRef.current;
		if (!pending) {
			return;
		}
		const { fieldApi, nextValue, prevValue } = pending;
		const previewStore = getGalleryPreviewReduxStore();
		if (previewStore) {
			clearAllGalleryImageFocus({
				galleryId: getModulaSettingsEditorConfig().galleryId,
				store: previewStore,
			});
		}
		fieldApi.handleChange(nextValue);
		if (previewStore) {
			applyGalleryTypeSideEffects(form, prevValue, nextValue);
			markCustomGridRepackAfterGalleryTypeChange(
				prevValue,
				nextValue,
				previewStore.getState()?.items?.items
			);
		}
		dropGalleryEditorLayoutStepsIfNeeded(undoRedo.dropLayoutSteps, {
			prevType: prevValue,
			nextType: nextValue,
		});
		setGalleryTypeConfirmOpen(false);
		pendingGalleryTypeRef.current = null;
	}, [form, undoRedo]);

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
					dropGalleryEditorLayoutStepsIfNeeded(
						undoRedo.dropLayoutSteps,
						{
							prevType: prev,
							nextType: v,
						}
					);
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
		[isGalleryTypeField, form, undoRedo]
	);

	return {
		makeOnChange,
		galleryTypeConfirmOpen,
		handleGalleryTypeConfirmCancel,
		handleGalleryTypeConfirm,
		isGalleryTypeField,
	};
}
