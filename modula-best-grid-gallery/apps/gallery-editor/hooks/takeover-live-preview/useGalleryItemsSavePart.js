/**
 * The gallery's items as a part of the editor save session (ADR 0059): the
 * preview store is the working catalog. Custom grid moves, resizes, locks,
 * page moves, repacks, reorders, the sort mode, content block edits and the
 * Image panel's item metadata change it at once and stay unsaved changes until
 * the editor save, which stores the catalog through `save-merged-items` (with
 * each attachment's title, alt and caption) and the sort mode through
 * `set-gallery-sorting`. Nothing here touches the store on a save, so a save
 * never re-lays the canvas or cancels a gesture.
 */
import {
	asGalleryItemList,
	commitPreviewCatalog,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	useEditorSavePart,
	useEditorSavedStateSync,
	useTakeoverSaveStatus,
} from 'editor-shell';
import {
	gallerySetSortingMode,
	saveMergedGalleryItems,
} from '../../api/galleryUploadApi';
import { GALLERY_SAVE_PARTS } from '../../constants/gallerySaveParts';
import { GALLERY_SAVE_OWNERS } from '../../constants/gallerySaveOwners';
import {
	createGalleryItemsSaveBaseline,
	galleryItemsSnapshot,
	saveGalleryItemsChanges,
} from '../../utils/galleryItemsSaveBaseline';
import {
	readPreviewSortingMode,
	setPreviewSortingMode,
} from '../../utils/previewSortingMode';
import {
	buildItemRestoreChange,
	readItemsRecoverySnapshot,
} from '../../utils/galleryItemsRecovery';

/**
 * @param {{
 *   galleryId: number,
 *   store: import('@reduxjs/toolkit').Store,
 *   commitItemsStep: (args: { label: string, change: unknown }) => number,
 * }} args
 * @return {{
 *   hasUnsavedChanges: () => boolean,
 *   adoptStoredItems: () => void,
 *   commitDerivedItems: (catalog: Object[]) => void,
 * }} Hydration and normalization hooks for the preview store.
 */
export function useGalleryItemsSavePart({ galleryId, store, commitItemsStep }) {
	const { runPersistTask } = useTakeoverSaveStatus();
	const syncSavedState = useEditorSavedStateSync();
	const baselineRef = useRef(null);
	const snapshotCacheRef = useRef({
		rows: null,
		sortingMode: '',
		value: null,
	});

	/** The store's catalog and sort mode, re-serialized only when they change. */
	const readSnapshot = useCallback(() => {
		const state = store.getState();
		const rows = state?.items?.items ?? [];
		const sortingMode = readPreviewSortingMode(store);
		const cache = snapshotCacheRef.current;
		if (cache.rows !== rows || cache.sortingMode !== sortingMode) {
			snapshotCacheRef.current = {
				rows,
				sortingMode,
				value: galleryItemsSnapshot(
					asGalleryItemList(rows),
					sortingMode
				),
			};
		}
		return snapshotCacheRef.current.value;
	}, [store]);

	// The store opens with the stored catalog: that is the first baseline.
	if (baselineRef.current === null) {
		baselineRef.current = createGalleryItemsSaveBaseline();
		baselineRef.current.adopt(readSnapshot());
	}

	const hasUnsavedChanges = useCallback(
		() => baselineRef.current.hasUnsavedChanges(readSnapshot()),
		[readSnapshot]
	);

	/**
	 * Store what is unsaved now; an edit made during the request stays
	 * unsaved. Each write reports the saved-state marker it returned, so the
	 * recovery copy is based on what it stored.
	 */
	const saveUnsavedItems = useCallback(
		() =>
			saveGalleryItemsChanges({
				snapshot: readSnapshot(),
				baseline: baselineRef.current,
				writeItems: async (items) =>
					syncSavedState(
						await saveMergedGalleryItems(galleryId, items)
					),
				writeSortingMode: async (mode) =>
					syncSavedState(
						await gallerySetSortingMode(galleryId, mode)
					),
			}),
		[galleryId, readSnapshot, syncSavedState]
	);

	// Through the queue: the top bar's save state follows the write.
	const save = useCallback(
		() =>
			runPersistTask(saveUnsavedItems, GALLERY_SAVE_OWNERS.previewItems),
		[runPersistTask, saveUnsavedItems]
	);

	/** The recovery copy keeps the catalog as shown, so rows never stored come back too. */
	const getRecoverySnapshot = useCallback(
		() => ({
			catalog: asGalleryItemList(store.getState().items.items),
			sortingMode: readPreviewSortingMode(store),
		}),
		[store]
	);

	/** Restore: the copied catalog as one history step, then its sort mode. */
	const restoreRecoverySnapshot = useCallback(
		(snapshot) => {
			const restored = readItemsRecoverySnapshot(snapshot);
			if (!restored) {
				return;
			}
			const before = asGalleryItemList(store.getState().items.items);
			commitPreviewCatalog(store, restored.catalog);
			setPreviewSortingMode(store, restored.sortingMode);
			commitItemsStep({
				label: __(
					'Restore unsaved changes',
					'modula-best-grid-gallery'
				),
				change: buildItemRestoreChange(before, restored.catalog),
			});
		},
		[store, commitItemsStep]
	);

	const notifyChange = useEditorSavePart({
		key: GALLERY_SAVE_PARTS.items,
		hasUnsavedChanges,
		save,
		getRecoverySnapshot,
		restoreRecoverySnapshot,
	});

	const adoptStoredItems = useCallback(() => {
		baselineRef.current.adopt(readSnapshot());
		notifyChange();
	}, [readSnapshot, notifyChange]);

	/**
	 * Commit a catalog change derived from the stored one (not an author's
	 * edit, e.g. Freeform occurrence ids): opening a gallery never leaves
	 * unsaved changes. With unsaved changes already, it joins them.
	 */
	const commitDerivedItems = useCallback(
		(catalog) => {
			const hadUnsavedChanges = hasUnsavedChanges();
			commitPreviewCatalog(store, catalog);
			if (!hadUnsavedChanges) {
				adoptStoredItems();
			}
		},
		[store, hasUnsavedChanges, adoptStoredItems]
	);

	// Every catalog or sort mode change may add or remove unsaved changes.
	useEffect(() => {
		let rows = store.getState()?.items?.items;
		let sortingMode = readPreviewSortingMode(store);
		return store.subscribe(() => {
			const nextRows = store.getState()?.items?.items;
			const nextSortingMode = readPreviewSortingMode(store);
			if (nextRows === rows && nextSortingMode === sortingMode) {
				return;
			}
			rows = nextRows;
			sortingMode = nextSortingMode;
			notifyChange();
		});
	}, [store, notifyChange]);

	return { hasUnsavedChanges, adoptStoredItems, commitDerivedItems };
}
