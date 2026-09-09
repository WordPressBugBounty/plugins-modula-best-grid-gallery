import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useMemo, useRef } from '@wordpress/element';
import { useQueryClient } from '@tanstack/react-query';
import { useTakeoverSaveStatus } from '../../context/TakeoverSaveStatusContext';
import { getGalleryBootstrapQueryKey } from '../../query/useGalleryBootstrapQuery';
import { saveMergedGalleryItems } from '../../api/galleryUploadApi';
import { previewCoreItemsToSaveMergedPayload } from '../../utils/embeddedGalleryItems';
import { previewItemsLayoutFingerprint } from '../../utils/previewItemsLayoutFingerprint';
import { patchBootstrapQueryItems } from '../../utils/patchBootstrapQueryItems';
import { PREVIEW_PERSIST_MIN_INTERVAL_MS } from './previewPersistConstants';

/**
 * Coordinates debounced preview item saves with bootstrap cache invalidation.
 *
 * @param {{
 *   galleryId: number,
 *   storeRef: import('react').MutableRefObject<import('@reduxjs/toolkit').Store|null>,
 *   preservePreviewItemsRef?: import('react').MutableRefObject<() => boolean>,
 * }} args
 */
export function usePreviewPersistCoordinator({
	galleryId,
	storeRef,
	preservePreviewItemsRef,
}) {
	const { runPersistTask, setPreviewItemsDirty } = useTakeoverSaveStatus();
	const queryClient = useQueryClient();

	const persistPreviewDebounceRef = useRef(null);
	const previewPersistDirtyRef = useRef(false);
	const previewPersistInFlightRef = useRef(false);
	const previewPersistLastAtRef = useRef(0);
	const persistInFlightPromiseRef = useRef(
		/** @type {Promise<void>|null} */ (null)
	);

	const bootstrapQueryKey = useMemo(
		() => getGalleryBootstrapQueryKey(galleryId),
		[galleryId]
	);

	const isPreviewItemsPersistPending = useCallback(() => {
		return (
			previewPersistDirtyRef.current || previewPersistInFlightRef.current
		);
	}, []);

	if (preservePreviewItemsRef) {
		preservePreviewItemsRef.current = isPreviewItemsPersistPending;
	}

	useEffect(() => {
		return () => {
			const persistId = persistPreviewDebounceRef.current;
			if (persistId) {
				window.clearTimeout(persistId);
			}
		};
	}, []);

	const patchBootstrapItemsFromStore = useCallback(() => {
		const st = storeRef.current;
		if (!st || !galleryId) {
			return;
		}
		const core = asGalleryItemList(st.getState().items.items);
		patchBootstrapQueryItems(queryClient, galleryId, core);
	}, [galleryId, queryClient, storeRef]);

	const runPersistTaskWithDeferredRefresh = useCallback(
		async (task) => {
			return runPersistTask(async () => {
				const result = await task();
				// Patch while persist is still in-flight so hydration cannot merge stale bootstrap.
				patchBootstrapItemsFromStore();
				return result;
			});
		},
		[runPersistTask, patchBootstrapItemsFromStore]
	);

	const clearPreviewPersistDirtyIfStoreMatches = useCallback(
		(savedFingerprint) => {
			const st = storeRef.current;
			if (!st) {
				previewPersistDirtyRef.current = false;
				setPreviewItemsDirty(false);
				return false;
			}
			const currentCore = asGalleryItemList(
				st.getState().items.items
			);
			const currentFingerprint =
				previewItemsLayoutFingerprint(currentCore);
			if (currentFingerprint === savedFingerprint) {
				previewPersistDirtyRef.current = false;
				setPreviewItemsDirty(false);
				return true;
			}
			previewPersistDirtyRef.current = true;
			setPreviewItemsDirty(true);
			return false;
		},
		[setPreviewItemsDirty, storeRef]
	);

	const persistPreviewCoreNow = useCallback(
		async (core) => {
			const savedFingerprint = previewItemsLayoutFingerprint(core);
			await runPersistTask(async () => {
				return saveMergedGalleryItems(
					galleryId,
					previewCoreItemsToSaveMergedPayload(core)
				);
			});
			patchBootstrapQueryItems(queryClient, galleryId, core);
			const matched =
				clearPreviewPersistDirtyIfStoreMatches(savedFingerprint);
			return matched;
		},
		[
			galleryId,
			queryClient,
			runPersistTask,
			clearPreviewPersistDirtyIfStoreMatches,
		]
	);

	const flushScheduledPreviewPersist = useCallback(() => {
		if (previewPersistInFlightRef.current) {
			return;
		}
		if (!previewPersistDirtyRef.current) {
			return;
		}
		const now = Date.now();
		const elapsed = now - previewPersistLastAtRef.current;
		if (elapsed < PREVIEW_PERSIST_MIN_INTERVAL_MS) {
			if (persistPreviewDebounceRef.current) {
				window.clearTimeout(persistPreviewDebounceRef.current);
			}
			persistPreviewDebounceRef.current = window.setTimeout(() => {
				persistPreviewDebounceRef.current = null;
				flushScheduledPreviewPersist();
			}, PREVIEW_PERSIST_MIN_INTERVAL_MS - elapsed);
			return;
		}
		const st = storeRef.current;
		if (!st || !galleryId) {
			return;
		}
		previewPersistInFlightRef.current = true;
		const flushPromise = (async () => {
			try {
				const core = asGalleryItemList(st.getState().items.items);
				const matched = await persistPreviewCoreNow(core);
				if (!matched) {
					flushScheduledPreviewPersist();
				}
			} catch (e) {
				previewPersistDirtyRef.current = true;
				setPreviewItemsDirty(true);
			} finally {
				previewPersistLastAtRef.current = Date.now();
				previewPersistInFlightRef.current = false;
				persistInFlightPromiseRef.current = null;
				if (previewPersistDirtyRef.current) {
					flushScheduledPreviewPersist();
				}
			}
		})();
		persistInFlightPromiseRef.current = flushPromise;
		void flushPromise;
	}, [galleryId, persistPreviewCoreNow, setPreviewItemsDirty, storeRef]);

	const markPreviewPersistDirty = useCallback(() => {
		previewPersistDirtyRef.current = true;
		setPreviewItemsDirty(true);
		if (persistPreviewDebounceRef.current) {
			window.clearTimeout(persistPreviewDebounceRef.current);
		}
		persistPreviewDebounceRef.current = window.setTimeout(() => {
			persistPreviewDebounceRef.current = null;
			flushScheduledPreviewPersist();
		}, PREVIEW_PERSIST_MIN_INTERVAL_MS);
	}, [flushScheduledPreviewPersist, setPreviewItemsDirty]);

	const persistPreviewItemsNow = useCallback(async () => {
		const st = storeRef.current;
		if (!st || !galleryId) {
			return;
		}
		if (persistPreviewDebounceRef.current) {
			window.clearTimeout(persistPreviewDebounceRef.current);
			persistPreviewDebounceRef.current = null;
		}
		if (
			previewPersistInFlightRef.current &&
			persistInFlightPromiseRef.current
		) {
			await persistInFlightPromiseRef.current;
		}
		if (!previewPersistDirtyRef.current) {
			return;
		}
		previewPersistInFlightRef.current = true;
		const flushPromise = (async () => {
			try {
				const core = asGalleryItemList(st.getState().items.items);
				const matched = await persistPreviewCoreNow(core);
				if (!matched) {
					flushScheduledPreviewPersist();
				}
			} catch (e) {
				previewPersistDirtyRef.current = true;
				setPreviewItemsDirty(true);
				throw e;
			} finally {
				previewPersistLastAtRef.current = Date.now();
				previewPersistInFlightRef.current = false;
				persistInFlightPromiseRef.current = null;
				if (previewPersistDirtyRef.current) {
					flushScheduledPreviewPersist();
				}
			}
		})();
		persistInFlightPromiseRef.current = flushPromise;
		await flushPromise;
	}, [
		galleryId,
		persistPreviewCoreNow,
		flushScheduledPreviewPersist,
		setPreviewItemsDirty,
		storeRef,
	]);

	const flushPreviewItemsPersistNow = useCallback(async () => {
		await persistPreviewItemsNow();
	}, [persistPreviewItemsNow]);

	const schedulePersistPreviewItems = useCallback(() => {
		markPreviewPersistDirty();
	}, [markPreviewPersistDirty]);

	const resetPreviewPersistDirty = useCallback(() => {
		if (persistPreviewDebounceRef.current) {
			window.clearTimeout(persistPreviewDebounceRef.current);
			persistPreviewDebounceRef.current = null;
		}
		previewPersistDirtyRef.current = false;
		setPreviewItemsDirty(false);
	}, [setPreviewItemsDirty]);

	return {
		queryClient,
		bootstrapQueryKey,
		runPersistTaskWithDeferredRefresh,
		markPreviewPersistDirty,
		resetPreviewPersistDirty,
		persistPreviewItemsNow,
		flushPreviewItemsPersistNow,
		schedulePersistPreviewItems,
		isPreviewItemsPersistPending,
	};
}
