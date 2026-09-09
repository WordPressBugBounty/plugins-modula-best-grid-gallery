/**
 * Debounced autosave for content-block tiles in the settings-column panel.
 */
import {
	asGalleryItemList,
	normalizeGalleryItemLookupString,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useRef } from '@wordpress/element';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveMergedGalleryItems } from '../api/galleryUploadApi';
import { syncPreviewCoreToStoreAndBootstrap } from '../utils/previewItemsCommit';
import {
	mergeContentBlockSaveFieldsIntoRow,
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { contentBlockStateToSaveFields } from '../utils/contentBlockEditState';
import { isContentBlockEditDirty } from '../utils/galleryItemEditDirtyState';
import { useTakeoverSaveStatus } from '../context/TakeoverSaveStatusContext';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import { getGalleryBootstrapQueryKey } from '../query/useGalleryBootstrapQuery';

const AUTOSAVE_MS = 450;

/**
 * Apply content-block fields onto the matching embedded row (or append if missing).
 *
 * @param {Object[]} core
 * @param {string}   eidNorm
 * @param {Object}   fields
 * @param {Object}   [fallbackRow]
 * @return {Object[]}
 */
function applyContentBlockFieldsToCore(core, eidNorm, fields, fallbackRow) {
	let found = false;
	const next = core.map((r) => {
		if (
			normalizeGalleryItemLookupString(r.embeddedId || r.id) === eidNorm
		) {
			found = true;
			return mergeContentBlockSaveFieldsIntoRow(r, fields);
		}
		return r;
	});
	if (!found && fallbackRow) {
		next.push(mergeContentBlockSaveFieldsIntoRow(fallbackRow, fields));
	}
	return reanchorEmbeddedRowsInMergedList(next);
}

/**
 * @param {{
 *   galleryId: number,
 *   storeIndex: number,
 *   item: Object|null,
 *   getSavePayload: () => Object|null|undefined,
 *   editSessionTick: number,
 *   enabled?: boolean,
 * }} args
 */
export function useGalleryItemContentBlockAutosave({
	galleryId,
	storeIndex: _storeIndex,
	item,
	getSavePayload,
	editSessionTick,
	enabled = true,
}) {
	const queryClient = useQueryClient();
	const { runPersistTask } = useTakeoverSaveStatus();
	const timerRef = useRef(
		/** @type {ReturnType<typeof setTimeout>|null} */ (null)
	);
	const savingRef = useRef(false);
	const pendingResaveRef = useRef(false);
	const getSavePayloadRef = useRef(getSavePayload);
	getSavePayloadRef.current = getSavePayload;
	const itemRef = useRef(item);
	itemRef.current = item;
	/** Dirty baseline — only advances after a successful persist (not optimistic Redux). */
	const baselineItemRef = useRef(item);
	const editSessionTickRef = useRef(editSessionTick);
	editSessionTickRef.current = editSessionTick;
	const baselineSessionTickRef = useRef(0);

	useEffect(() => {
		baselineItemRef.current = item;
		baselineSessionTickRef.current = 0;
		pendingResaveRef.current = false;
	}, [item?.embeddedId, item?.id]);

	const saveMutation = useMutation({
		mutationFn: async () => {
			const store = getGalleryPreviewReduxStore();
			const row = itemRef.current;
			if (!galleryId || !row || !store) {
				return null;
			}
			const payload = getSavePayloadRef.current?.();
			if (!payload) {
				return null;
			}
			if (
				!isContentBlockEditDirty(baselineItemRef.current, () => payload)
			) {
				return null;
			}
			const eidNorm = normalizeGalleryItemLookupString(
				row.embeddedId || row.id
			);
			if (!eidNorm) {
				return null;
			}
			const fields = contentBlockStateToSaveFields(payload);
			const sessionTickAtSave = editSessionTickRef.current;

			// Optimistic preview update before REST (baseline stays until persist succeeds).
			const optimistic = applyContentBlockFieldsToCore(
				asGalleryItemList(store.getState().items.items),
				eidNorm,
				fields,
				row
			);
			syncPreviewCoreToStoreAndBootstrap(
				store,
				queryClient,
				galleryId,
				optimistic
			);

			await runPersistTask(async () => {
				const latest = applyContentBlockFieldsToCore(
					asGalleryItemList(store.getState().items.items),
					eidNorm,
					fields,
					row
				);
				await saveMergedGalleryItems(
					galleryId,
					previewCoreItemsToSaveMergedPayload(latest)
				);
				syncPreviewCoreToStoreAndBootstrap(
					store,
					queryClient,
					galleryId,
					latest
				);
			});

			baselineItemRef.current = mergeContentBlockSaveFieldsIntoRow(
				row,
				fields
			);
			baselineSessionTickRef.current = sessionTickAtSave;
			return fields;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: getGalleryBootstrapQueryKey(galleryId),
			});
		},
		onError: (e) => {
			// eslint-disable-next-line no-console
			console.error(e);
		},
	});

	const { mutate, mutateAsync, isPending } = saveMutation;
	const isPendingRef = useRef(isPending);
	isPendingRef.current = isPending;

	const scheduleSave = useCallback(() => {
		if (!enabled) {
			return;
		}
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			if (savingRef.current || isPendingRef.current) {
				pendingResaveRef.current = true;
				return;
			}
			savingRef.current = true;
			mutate(undefined, {
				onSettled: () => {
					savingRef.current = false;
					const needsResave =
						pendingResaveRef.current ||
						(editSessionTickRef.current >
							baselineSessionTickRef.current &&
							isContentBlockEditDirty(
								baselineItemRef.current,
								() => getSavePayloadRef.current?.()
							));
					pendingResaveRef.current = false;
					if (needsResave) {
						scheduleSave();
					}
				},
			});
		}, AUTOSAVE_MS);
	}, [enabled, mutate]);

	useEffect(() => {
		if (!enabled || editSessionTick === 0) {
			return;
		}
		scheduleSave();
	}, [editSessionTick, enabled, scheduleSave]);

	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	const flush = useCallback(async () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		pendingResaveRef.current = false;
		if (!enabled || !itemRef.current) {
			return;
		}
		if (
			!isContentBlockEditDirty(baselineItemRef.current, () =>
				getSavePayloadRef.current?.()
			)
		) {
			return;
		}
		await mutateAsync();
	}, [enabled, mutateAsync]);

	return { flush };
}
