import {
	asGalleryItemList,
	normalizeGalleryItemLookupString,
} from 'gallery-shared/preview';
import { useCallback, useMemo } from '@wordpress/element';
import { useQueryClient } from '@tanstack/react-query';
import { useReorderDraft, useTakeoverSaveStatus } from 'editor-shell';
import {
	galleryApplySortingAndOrder,
	gallerySetSortingMode,
	saveMergedGalleryItems,
} from '../api/galleryUploadApi';
import { useGalleryItemEditSidebar } from '../context/GalleryItemEditSidebarContext';
import { useInvalidateGalleryBootstrap } from './useInvalidateGalleryBootstrap';
import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';
import {
	getGalleryBootstrapQueryKey,
	useGalleryBootstrapQuery,
} from '../query/useGalleryBootstrapQuery';
import {
	bootstrapRowsForSorting,
	computeSortedAttachmentOrder,
	fetchAttachmentSortFields,
	isGallerySortMode,
} from '../utils/gallerySortingApply';
import { getSortingMenuDefinition } from '../utils/gallerySortingMenuDefinition';
import {
	isContentBlockGalleryItemRow,
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { buildGalleryReorderRows } from '../components/gallery-reorder/buildGalleryReorderRows';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import {
	reorderCoreItemsByAttachmentIds,
	stripStaleModulaRowIndex,
	syncPreviewCoreToStoreAndBootstrap,
} from '../utils/previewItemsCommit';
import { cloneBootstrapItemsForPreviewStore } from '../utils/takeoverLivePreviewBootstrap';

/**
 * Drop stale `modulaRowIndex` from reordered rows.
 *
 * `modulaRowIndex` is the row's position in post meta `modula-images` captured at bootstrap.
 * After a reorder the persisted `modula-images` order changes, so the cached value no longer
 * matches; leaving it in place makes index-based writes (focus, metadata, remove) target the
 * wrong row and visibly duplicate an image in the preview. Removing it lets positional index
 * fall back to the (now correct) display order until the next bootstrap refetch.
 *
 * @param {Object[]} rows Core rows in the new order.
 * @return {Object[]} Rows without `modulaRowIndex`.
 */
function stripStaleModulaRowIndexLocal(rows) {
	return stripStaleModulaRowIndex(rows);
}

/**
 * Optimistic preview + React Query bootstrap cache after reorder/sort.
 *
 * @param {import('@tanstack/react-query').QueryClient}        queryClient
 * @param {number}                                             galleryId
 * @param {{ previewCore: Object[], bootstrapCore: Object[] }} cores
 * @param {string|undefined}                                   sortingMode
 */
function patchOptimisticGalleryItemOrder(
	queryClient,
	galleryId,
	cores,
	sortingMode
) {
	const previewCore = stripStaleModulaRowIndexLocal(cores.previewCore);
	const bootstrapCore = stripStaleModulaRowIndexLocal(cores.bootstrapCore);
	const store = getGalleryPreviewReduxStore();
	const bootstrapKey = getGalleryBootstrapQueryKey(galleryId);
	const cacheItems = bootstrapCore.length > 0 ? bootstrapCore : previewCore;
	queryClient.setQueryData(bootstrapKey, (prev) => {
		if (!prev || typeof prev !== 'object') {
			return prev;
		}
		return {
			...prev,
			items: cloneBootstrapItemsForPreviewStore(cacheItems),
			metadata: {
				...(prev.metadata && typeof prev.metadata === 'object'
					? prev.metadata
					: {}),
				...(typeof sortingMode === 'string'
					? { gallerySorting: sortingMode }
					: {}),
			},
		};
	});
	if (store && previewCore.length) {
		syncPreviewCoreToStoreAndBootstrap(
			store,
			queryClient,
			galleryId,
			previewCore
		);
	}
}

function resolveBootstrapCoreItems(queryClient, galleryId) {
	const data = queryClient.getQueryData(
		getGalleryBootstrapQueryKey(galleryId)
	);
	if (!Array.isArray(data?.items)) {
		return [];
	}
	return data.items.slice();
}

/**
 * Reorder attachments for a sort mode and re-anchor embedded rows for v2 persist.
 *
 * @param {Object[]} coreItems
 * @param {number[]} orderedAttachmentIds
 * @return {Object[]}
 */
function buildSortedMergedCoreForPersist(coreItems, orderedAttachmentIds) {
	return reanchorEmbeddedRowsInMergedList(
		reorderCoreItemsByAttachmentIds(coreItems, orderedAttachmentIds)
	);
}

/**
 * The gallery's sort mode and its persistence (the canvas toolbar's Sort
 * popover).
 *
 * @param {{ galleryId: number, onManualSorting: () => void }} args
 *        `onManualSorting` runs once "Drag and drop reorder" is saved; it
 *        opens the Reorder view.
 */
export function useGallerySortMode({ galleryId, onManualSorting }) {
	const { runPersistTask } = useTakeoverSaveStatus();
	const queryClient = useQueryClient();
	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);
	const { data: bootstrap } = useGalleryBootstrapQuery(galleryId);

	const editor = useModulaSettingsEditorConfig();
	const pro = Boolean(editor.isPro);

	const rawMode = bootstrap?.metadata?.gallerySorting;
	const currentMode = isGallerySortMode(rawMode) ? rawMode : 'manual';

	const applySortMode = useCallback(
		async (mode) => {
			if (!galleryId || !isGallerySortMode(mode)) {
				return;
			}
			const bootstrapKey = getGalleryBootstrapQueryKey(galleryId);
			try {
				if (mode === 'manual') {
					await runPersistTask(async () => {
						await galleryApplySortingAndOrder(galleryId, {
							sorting: 'manual',
						});
					}, 'gallery-order');
					queryClient.setQueryData(bootstrapKey, (prev) => {
						if (!prev || typeof prev !== 'object') {
							return prev;
						}
						return {
							...prev,
							metadata: {
								...(prev.metadata &&
								typeof prev.metadata === 'object'
									? prev.metadata
									: {}),
								gallerySorting: 'manual',
							},
						};
					});
				} else {
					const data = queryClient.getQueryData(bootstrapKey);
					const imageRows = bootstrapRowsForSorting(data?.items);
					const ids = imageRows.map((r) => r.id);
					const media = await fetchAttachmentSortFields(ids);
					const order = computeSortedAttachmentOrder(
						imageRows,
						mode,
						media
					);
					const bootstrapCore = resolveBootstrapCoreItems(
						queryClient,
						galleryId
					);
					const store = getGalleryPreviewReduxStore();
					const previewCore = store
						? asGalleryItemList(store.getState().items.items)
						: bootstrapCore;
					const reorderedPreview = buildSortedMergedCoreForPersist(
						previewCore,
						order
					);
					const reorderedBootstrap = buildSortedMergedCoreForPersist(
						bootstrapCore,
						order
					);
					patchOptimisticGalleryItemOrder(
						queryClient,
						galleryId,
						{
							previewCore: reorderedPreview,
							bootstrapCore: reorderedBootstrap,
						},
						mode
					);
					await runPersistTask(async () => {
						await saveMergedGalleryItems(
							galleryId,
							previewCoreItemsToSaveMergedPayload(
								reorderedBootstrap
							)
						);
						await gallerySetSortingMode(galleryId, mode);
					}, 'gallery-order');
				}
			} catch (e) {
				invalidateBootstrap();
				throw e;
			}
		},
		[galleryId, invalidateBootstrap, queryClient, runPersistTask]
	);

	const handleSortOptionClick = useCallback(
		(rowId) => {
			if (!pro || !galleryId) {
				return;
			}
			if (rowId === 'manual') {
				void applySortMode('manual')
					.then(onManualSorting)
					.catch(() => {
						/* Error: Notice + save status */
					});
				return;
			}
			if (!isGallerySortMode(rowId)) {
				return;
			}
			void applySortMode(rowId).catch(() => {
				/* Error: Notice + save status */
			});
		},
		[applySortMode, galleryId, onManualSorting, pro]
	);

	return {
		currentMode,
		sortRows: getSortingMenuDefinition(),
		handleSortOptionClick,
	};
}

/**
 * The Reorder dialog: the draft order (drag or arrows) and its persistence.
 * `onClose` closes the dialog; the draft goes with it.
 *
 * @param {{ galleryId: number, onClose: () => void }} args
 */
export function useGalleryReorderController({ galleryId, onClose }) {
	const itemEditSidebar = useGalleryItemEditSidebar();
	const { runPersistTask } = useTakeoverSaveStatus();
	const queryClient = useQueryClient();
	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);

	const { data: bootstrap } = useGalleryBootstrapQuery(galleryId);

	const rows = useMemo(() => buildGalleryReorderRows(bootstrap), [bootstrap]);

	const { orderedRows, onDragEnd, moveOrderKey } = useReorderDraft(rows);

	const applyManualOrder = useCallback(() => {
		const merged = orderedRows
			.map((r) => (r.rawRow ? { ...r.rawRow } : null))
			.filter(Boolean);
		if (!merged.length) {
			return;
		}
		const reanchored = reanchorEmbeddedRowsInMergedList(merged);
		const prepared = stripStaleModulaRowIndex(reanchored);
		patchOptimisticGalleryItemOrder(
			queryClient,
			galleryId,
			{
				previewCore: prepared,
				bootstrapCore: prepared,
			},
			'manual'
		);
		void runPersistTask(async () => {
			await saveMergedGalleryItems(
				galleryId,
				previewCoreItemsToSaveMergedPayload(prepared)
			);
			const store = getGalleryPreviewReduxStore();
			if (store) {
				syncPreviewCoreToStoreAndBootstrap(
					store,
					queryClient,
					galleryId,
					prepared
				);
			}
		}, 'gallery-order').catch(() => {
			invalidateBootstrap();
		});
	}, [
		galleryId,
		orderedRows,
		queryClient,
		runPersistTask,
		invalidateBootstrap,
	]);

	const openContentBlockEdit = useCallback(
		(rawRow) => {
			if (!rawRow || !isContentBlockGalleryItemRow(rawRow)) {
				return;
			}
			const eidNorm = normalizeGalleryItemLookupString(
				rawRow.embeddedId || rawRow.id
			);
			if (!eidNorm) {
				return;
			}
			const store = getGalleryPreviewReduxStore();
			const items = store?.getState?.().items?.items;
			if (!Array.isArray(items)) {
				return;
			}
			const storeIndex = items.findIndex(
				(r) =>
					normalizeGalleryItemLookupString(r.embeddedId || r.id) ===
					eidNorm
			);
			if (storeIndex < 0) {
				return;
			}
			onClose();
			itemEditSidebar?.open?.(storeIndex);
		},
		[onClose, itemEditSidebar]
	);

	return {
		orderedRows,
		openContentBlockEdit,
		onDragEnd,
		moveOrderKey,
		applyManualOrder,
	};
}
