import {
	asGalleryItemList,
	normalizeGalleryItemLookupString,
} from 'gallery-shared/preview';
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { arrayMove } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import {
	galleryApplySortingAndOrder,
	gallerySetSortingMode,
	saveMergedGalleryItems,
} from '../api/galleryUploadApi';
import { useTakeoverSaveStatus } from '../context/TakeoverSaveStatusContext';
import { useGalleryReorderSidebar } from '../context/GalleryReorderSidebarContext';
import { useGalleryItemEditSidebar } from '../context/GalleryItemEditSidebarContext';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
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
import { reconcileOrderKeysWithServer } from '../components/gallery-reorder/galleryReorderUtils';
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
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {number}                                      galleryId
 * @param {{ previewCore: Object[], bootstrapCore: Object[] }} cores
 * @param {string|undefined}                            sortingMode
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
 * Sort & reorder settings-column takeover state and persistence.
 *
 * @param {{ galleryId: number }} args
 */
export function useGalleryReorderController({ galleryId }) {
	const reorderSidebar = useGalleryReorderSidebar();
	const itemEditSidebar = useGalleryItemEditSidebar();
	const closePanel = useCallback(() => {
		reorderSidebar?.close();
	}, [reorderSidebar]);
	const { runPersistTask, errorMessage, clearError } =
		useTakeoverSaveStatus();
	const { form } = useGallerySettingsFormBundle();
	const queryClient = useQueryClient();
	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);

	const reorderHandleRefs = useRef(
		/** @type {Map<string, HTMLElement>} */ (new Map())
	);
	const registerReorderHandleRef = useCallback((id, el) => {
		const key = String(id);
		if (el instanceof HTMLElement) {
			reorderHandleRefs.current.set(key, el);
		} else {
			reorderHandleRefs.current.delete(key);
		}
	}, []);

	const focusReorderHandle = useCallback((sortKey) => {
		const el = reorderHandleRefs.current.get(String(sortKey));
		if (el instanceof HTMLElement) {
			el.focus({ preventScroll: true });
		}
	}, []);

	const { data: bootstrap } = useGalleryBootstrapQuery(galleryId);
	const [step, setStep] = useState(
		/** @type {'setup' | 'reorder'} */ ('setup')
	);

	const editor = useModulaSettingsEditorConfig();
	const pro = Boolean(editor.isPro);

	const rawMode = bootstrap?.metadata?.gallerySorting;
	const currentMode = isGallerySortMode(rawMode) ? rawMode : 'manual';

	const rows = useMemo(() => buildGalleryReorderRows(bootstrap), [bootstrap]);

	const [orderKeys, setOrderKeys] = useState(() =>
		rows.map((r) => r.sortKey)
	);

	useEffect(() => {
		const nextKeys = rows.map((r) => r.sortKey);
		setOrderKeys((prev) =>
			reconcileOrderKeysWithServer(prev, nextKeys, step)
		);
	}, [rows, step]);

	const keyToRow = useMemo(() => {
		const m = new Map();
		for (const r of rows) {
			m.set(r.sortKey, r);
		}
		return m;
	}, [rows]);

	const orderedRows = useMemo(
		() => orderKeys.map((k) => keyToRow.get(k)).filter(Boolean),
		[orderKeys, keyToRow]
	);

	const onDragEnd = useCallback(
		(event) => {
			const { active, over } = event;
			if (!over || active.id === over.id) {
				return;
			}
			const activeKey = String(active.id);
			const overKey = String(over.id);
			setOrderKeys((keys) => {
				const oldIndex = keys.indexOf(activeKey);
				const newIndex = keys.indexOf(overKey);
				if (oldIndex < 0 || newIndex < 0) {
					return keys;
				}
				return arrayMove(keys, oldIndex, newIndex);
			});
			window.requestAnimationFrame(() => {
				window.requestAnimationFrame(() => {
					focusReorderHandle(activeKey);
				});
			});
		},
		[focusReorderHandle]
	);

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
					});
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
					});
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
					.then(() => setStep('reorder'))
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
		[applySortMode, galleryId, pro]
	);

	const applyManualOrder = useCallback(() => {
		const merged = orderKeys
			.map((k) => {
				const r = keyToRow.get(k);
				return r?.rawRow ? { ...r.rawRow } : null;
			})
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
		}).catch(() => {
			invalidateBootstrap();
		});
	}, [
		galleryId,
		orderKeys,
		keyToRow,
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
			closePanel();
			itemEditSidebar?.open?.(storeIndex);
		},
		[closePanel, itemEditSidebar]
	);

	const sortRows = getSortingMenuDefinition();

	return {
		step,
		setStep,
		closePanel,
		form,
		errorMessage,
		clearError,
		pro,
		galleryId,
		currentMode,
		sortRows,
		handleSortOptionClick,
		orderKeys,
		orderedRows,
		openContentBlockEdit,
		registerReorderHandleRef,
		onDragEnd,
		applyManualOrder,
		canApplyOrder: orderedRows.length > 0,
	};
}
