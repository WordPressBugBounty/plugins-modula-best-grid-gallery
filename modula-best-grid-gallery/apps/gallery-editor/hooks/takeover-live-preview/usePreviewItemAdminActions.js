import {
	asGalleryItemList,
	getLayoutPolicy,
	isGridItemLocked,
	isTemplateProtectedEmbeddedRow,
	modulaImagesRowIndexForPreviewWrite,
	movePreviewItemToAdjacentPage,
	normalizeGalleryItemLookupString,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { useCallback, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	galleryRemoveImageByIndex,
	galleryReplaceImageByIndex,
	saveMergedGalleryItems,
} from '../../api/galleryUploadApi';
import { captionToPlainString } from '../../utils/captionToPlainString';
import {
	commitPreviewCatalog,
	mergeModulaRowIntoPreviewItem,
	removePreviewItemAtStoreIndex,
	syncPreviewCoreToStoreAndBootstrap,
} from '../../utils/previewItemsCommit';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
	previewCoreItemsToSaveMergedPayload,
	mergeContentBlockSaveFieldsIntoRow,
	reanchorEmbeddedRowsInMergedList,
} from '../../utils/embeddedGalleryItems';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { getNextImageStoreIndexAfterRemove } from '../../utils/galleryItemEditNavigation';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import {
	boundGalleryAllowsReplace,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';

/**
 * Preview item admin actions (remove, replace, content blocks) and context value.
 *
 * @param {{
 *   galleryId: number,
 *   galleryType: string,
 *   queryClient: import('@tanstack/react-query').QueryClient,
 *   storeRef: import('react').MutableRefObject<import('@reduxjs/toolkit').Store|null>,
 *   runPreviewItemMutation: (task: () => Promise<unknown>) => Promise<unknown>,
 *   contentBlockEdit: { storeIndex: number, row: Record<string, unknown> } | null,
 *   setContentBlockEdit: (value: { storeIndex: number, row: Record<string, unknown> } | null) => void,
 *   saveMetaModalReturnFocus: () => void,
 *   setMetaModalStoreIndex: (idx: number | null) => void,
 *   schedulePersistPreviewItems: () => void,
 * }} args
 */
export function usePreviewItemAdminActions({
	galleryId,
	galleryType,
	queryClient,
	storeRef,
	runPreviewItemMutation,
	contentBlockEdit,
	setContentBlockEdit,
	saveMetaModalReturnFocus,
	setMetaModalStoreIndex: _setMetaModalStoreIndex,
	schedulePersistPreviewItems,
}) {
	const itemEditSidebar = useGalleryItemEditSidebar();

	const performRemoveItem = useCallback(
		async (storeIndex) => {
			const st = storeRef.current;
			if (!st || !galleryId) {
				return;
			}
			const itemsSnap = st.getState().items.items;
			const row = itemsSnap[storeIndex];
			if (row && isEmbeddedGalleryItemRow(row)) {
				if (isTemplateProtectedEmbeddedRow(row, galleryType)) {
					return;
				}
				const coreIndex = storeIndexToCoreIndex(itemsSnap, storeIndex);
				if (coreIndex < 0) {
					return;
				}
				const wasEditingThis =
					itemEditSidebar?.storeIndex !== null &&
					itemEditSidebar?.storeIndex === storeIndex;
				const core = asGalleryItemList(itemsSnap);
				core.splice(coreIndex, 1);
				try {
					await runPreviewItemMutation(async () => {
						await saveMergedGalleryItems(
							galleryId,
							previewCoreItemsToSaveMergedPayload(core)
						);
					});
					commitPreviewCatalog(st, core);
					if (wasEditingThis) {
						itemEditSidebar.close();
					}
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error(e);
				}
				return;
			}
			const restRowIndex = modulaImagesRowIndexForPreviewWrite(
				itemsSnap,
				storeIndex
			);
			if (restRowIndex < 0) {
				return;
			}
			const wasEditingThis =
				itemEditSidebar?.storeIndex !== null &&
				itemEditSidebar?.storeIndex === storeIndex;
			const nextStoreIndex = wasEditingThis
				? getNextImageStoreIndexAfterRemove(itemsSnap, storeIndex)
				: null;
			try {
				await runPreviewItemMutation(async () => {
					await galleryRemoveImageByIndex(galleryId, restRowIndex);
					// Update Redux before deferred bootstrap patch (runPersistTaskWithDeferredRefresh).
					removePreviewItemAtStoreIndex(st, storeIndex);
				});
				if (wasEditingThis) {
					if (nextStoreIndex !== null) {
						itemEditSidebar.open(nextStoreIndex);
					} else {
						itemEditSidebar.close();
					}
				}
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e);
			}
		},
		[
			galleryId,
			galleryType,
			itemEditSidebar,
			runPreviewItemMutation,
			storeRef,
		]
	);

	const requestRemoveItem = useCallback(
		(storeIndex) => performRemoveItem(storeIndex),
		[performRemoveItem]
	);

	const openReplaceMedia = useCallback(
		(storeIndexOrIndices) => {
			const st = storeRef.current;
			if (!st || !galleryId || typeof window === 'undefined') {
				return Promise.resolve(false);
			}
			if (
				!boundGalleryAllowsReplace(
					getBoundGallerySummaryFromEditor(
						getModulaSettingsEditorConfig()
					)
				)
			) {
				return Promise.resolve(false);
			}
			const wp = window.wp;
			if (!wp?.media) {
				return Promise.resolve(false);
			}

			const raw = Array.isArray(storeIndexOrIndices)
				? storeIndexOrIndices
				: [storeIndexOrIndices];
			const indices = [
				...new Set(
					raw
						.map((n) => Number(n))
						.filter((n) => Number.isFinite(n) && n >= 0)
				),
			].sort((a, b) => a - b);
			if (indices.length === 0) {
				return Promise.resolve(false);
			}
			const max = indices.length;
			const isMulti = max > 1;

			const frame = wp.media({
				library: { type: 'image' },
				multiple: isMulti ? 'add' : false,
				title: isMulti
					? __('Replace images', 'modula-best-grid-gallery')
					: __('Replace image', 'modula-best-grid-gallery'),
				button: {
					text: isMulti
						? __('Replace in gallery', 'modula-best-grid-gallery')
						: __('Replace', 'modula-best-grid-gallery'),
				},
			});

			return new Promise((resolve) => {
				let settled = false;
				let selectStarted = false;
				/** @param {boolean} didReplace */
				const finish = (didReplace) => {
					if (settled) {
						return;
					}
					settled = true;
					resolve(didReplace);
				};

				frame.on('open', () => {
					const selection = frame.state().get('selection');
					selection.reset();
					if (!isMulti) {
						return;
					}
					selection.on('add', (model) => {
						if (selection.length > max) {
							selection.remove(model);
						}
					});
				});

				frame.on('close', () => {
					/* Defer so a preceding `select` can mark selectStarted. */
					window.setTimeout(() => {
						if (!selectStarted) {
							finish(false);
						}
					}, 0);
				});

				frame.on('select', async () => {
					selectStarted = true;
					const selection = frame.state().get('selection');
					/** @type {Object[]} */
					const picked = [];
					selection.each((attachment) => {
						const json = attachment?.toJSON?.() || {};
						const id = Number(json.id);
						if (Number.isFinite(id) && id > 0) {
							picked.push(json);
						}
					});
					const toReplace = picked.slice(0, max);
					if (toReplace.length === 0) {
						finish(false);
						return;
					}
					let didReplace = false;
					try {
						await runPreviewItemMutation(async () => {
							for (let i = 0; i < toReplace.length; i++) {
								const storeIndex = indices[i];
								const sel = toReplace[i];
								const newId = Number(sel.id);
								const itemsSnap = st.getState().items.items;
								const restRowIndex =
									modulaImagesRowIndexForPreviewWrite(
										itemsSnap,
										storeIndex
									);
								const displayCoreIndex = storeIndexToCoreIndex(
									itemsSnap,
									storeIndex
								);
								if (restRowIndex < 0 || displayCoreIndex < 0) {
									continue;
								}
								const res = await galleryReplaceImageByIndex(
									galleryId,
									restRowIndex,
									newId
								);
								const row = res?.image;
								const prev = itemsSnap[storeIndex];
								const merged = row
									? mergeModulaRowIntoPreviewItem(prev, row)
									: mergeModulaRowIntoPreviewItem(prev, {
											id: newId,
											url: sel.url,
											title: captionToPlainString(
												sel.title
											),
											alt: sel.alt || '',
											description:
												captionToPlainString(
													sel.caption
												) || '',
										});
								const core = asGalleryItemList(itemsSnap);
								if (displayCoreIndex < core.length) {
									core[displayCoreIndex] = merged;
									syncPreviewCoreToStoreAndBootstrap(
										st,
										queryClient,
										galleryId,
										core
									);
									didReplace = true;
								}
							}
						});
					} catch (e) {
						// eslint-disable-next-line no-console
						console.error(e);
					} finally {
						finish(didReplace);
					}
				});

				frame.open();
			});
		},
		[galleryId, queryClient, runPreviewItemMutation, storeRef]
	);

	const toggleGridItemLock = useCallback(
		(storeIndex) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const itemsSnap = st.getState().items.items;
			const coreIndex = storeIndexToCoreIndex(itemsSnap, storeIndex);
			if (coreIndex < 0) {
				return;
			}
			const core = asGalleryItemList(itemsSnap);
			const prev = core[coreIndex];
			if (!prev) {
				return;
			}
			const nextLocked = !isGridItemLocked(prev);
			core[coreIndex] = {
				...prev,
				gridLocked: nextLocked ? 1 : 0,
			};
			commitPreviewCatalog(st, core);
			schedulePersistPreviewItems();
		},
		[schedulePersistPreviewItems, storeRef]
	);

	const openEditContentBlock = useCallback(
		(storeIndex) => {
			const st = storeRef.current;
			const row = st?.getState().items.items[storeIndex];
			if (!row || !isContentBlockGalleryItemRow(row)) {
				return;
			}
			saveMetaModalReturnFocus();
			if (itemEditSidebar?.open) {
				itemEditSidebar.open(storeIndex);
			}
		},
		[itemEditSidebar, saveMetaModalReturnFocus, storeRef]
	);

	const handleSaveContentBlock = useCallback(
		async (fields) => {
			if (!contentBlockEdit || !galleryId) {
				return;
			}
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const eidNorm = normalizeGalleryItemLookupString(
				contentBlockEdit.row.embeddedId || contentBlockEdit.row.id
			);
			if (!eidNorm) {
				return;
			}
			const core = asGalleryItemList(st.getState().items.items);
			const next = core.map((r) =>
				normalizeGalleryItemLookupString(r.embeddedId || r.id) ===
				eidNorm
					? mergeContentBlockSaveFieldsIntoRow(r, fields)
					: r
			);
			const reanchored = reanchorEmbeddedRowsInMergedList(next);
			await runPreviewItemMutation(async () => {
				await saveMergedGalleryItems(
					galleryId,
					previewCoreItemsToSaveMergedPayload(reanchored)
				);
			});
			commitPreviewCatalog(st, reanchored);
			setContentBlockEdit(null);
		},
		[
			contentBlockEdit,
			galleryId,
			runPreviewItemMutation,
			setContentBlockEdit,
			storeRef,
		]
	);

	const moveItemToPreviousPage = useCallback(
		(storeIndex) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const moved = movePreviewItemToAdjacentPage(
				st,
				storeIndex,
				'previous'
			);
			if (moved) {
				schedulePersistPreviewItems();
			}
		},
		[schedulePersistPreviewItems, storeRef]
	);

	const moveItemToNextPage = useCallback(
		(storeIndex) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const moved = movePreviewItemToAdjacentPage(st, storeIndex, 'next');
			if (moved) {
				schedulePersistPreviewItems();
			}
		},
		[schedulePersistPreviewItems, storeRef]
	);

	const previewAdminValue = useMemo(
		() => ({
			openEditMetadata: (idx) => {
				saveMetaModalReturnFocus();
				if (itemEditSidebar?.open) {
					itemEditSidebar.open(idx);
				}
			},
			openFocusPoint: (idx) => {
				if (
					!getLayoutPolicy({ general: { type: galleryType } })
						.capabilities.imageFocus
				) {
					return;
				}
				itemEditSidebar?.openFocus?.(idx);
			},
			openReplaceMedia,
			removeItem: requestRemoveItem,
			toggleGridItemLock:
				galleryType === 'custom-grid' ? toggleGridItemLock : undefined,
			openEditContentBlock,
			moveItemToPreviousPage,
			moveItemToNextPage,
			schedulePersistPreviewItems,
			selectedEditStoreIndex: itemEditSidebar?.storeIndex ?? null,
			isItemEditSelected: (idx) =>
				itemEditSidebar?.storeIndex !== null &&
				itemEditSidebar?.storeIndex === idx,
		}),
		[
			galleryType,
			openReplaceMedia,
			requestRemoveItem,
			toggleGridItemLock,
			openEditContentBlock,
			moveItemToPreviousPage,
			moveItemToNextPage,
			schedulePersistPreviewItems,
			saveMetaModalReturnFocus,
			itemEditSidebar,
		]
	);

	return {
		handleSaveContentBlock,
		previewAdminValue,
	};
}
