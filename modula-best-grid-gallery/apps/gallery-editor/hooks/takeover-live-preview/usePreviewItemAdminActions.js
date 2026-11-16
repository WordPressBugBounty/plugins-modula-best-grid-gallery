import {
	asGalleryItemList,
	getLayoutPolicy,
	isGridItemLocked,
	isTemplateProtectedEmbeddedRow,
	movePreviewItemToAdjacentPage,
	normalizeGalleryItemLookupString,
	previewItemRowLookupKey,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { useTakeoverToast, useUndoToastOffer } from 'editor-shell';
import {
	commitPreviewCatalog,
	removePreviewItemAtStoreIndex,
} from '../../utils/previewItemsCommit';
import {
	replaceAttachmentsInPreviewCatalog,
	workingTileLayout,
} from '../../utils/galleryItemRowsCommit';
import { applyGalleryItemHistoryOp } from '../../utils/galleryItemHistory';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
	mergeContentBlockSaveFieldsIntoRow,
	reanchorEmbeddedRowsInMergedList,
} from '../../utils/embeddedGalleryItems';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import SelectedTileToolbar from '../../components/preview/SelectedTileToolbar';
import { selectedTileActions } from '../../utils/selectedTileActions';
import { getNextImageStoreIndexAfterRemove } from '../../utils/galleryItemEditNavigation';
import { getModulaSettingsEditorConfig } from '../../config/modulaSettingsEditorConfig';
import {
	boundGalleryAllowsReplace,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { snapshotCustomGridItemCells } from '../../utils/customGridItemCells';
import {
	commitCustomGridLayoutHistoryStep,
	commitCustomGridLockHistoryStep,
	restoreCatalogFromLayoutHistory,
} from '../../utils/customGridLayoutHistory';
import {
	buildItemRemovalChange,
	describeRemovedItem,
} from '../../utils/galleryItemRemovalHistory';

/**
 * After a removal: the panel moves to the next image when it showed the
 * removed one; otherwise any selection goes, because store indices shifted
 * and it would point at a neighbour.
 *
 * @param {import('../../context/GalleryItemEditSidebarContext').GalleryItemEditSidebarValue|null} itemEditSidebar
 * @param {boolean}     wasEditingThis The panel showed the removed item.
 * @param {number|null} nextStoreIndex Image to show next, if any.
 */
function settleSelectionAfterRemoval(
	itemEditSidebar,
	wasEditingThis,
	nextStoreIndex
) {
	if (!itemEditSidebar) {
		return;
	}
	if (wasEditingThis && nextStoreIndex !== null) {
		itemEditSidebar.open(nextStoreIndex);
		return;
	}
	if (wasEditingThis || itemEditSidebar.selectedIndex !== null) {
		itemEditSidebar.close();
	}
}

/**
 * Preview item admin actions (remove, replace, content blocks) and context value.
 * Removal, replacement, layout, lock, page moves and content block edits
 * change the preview store only: the items part of the editor save session
 * stores them on Save. Replace reads the new image's row from the item-rows
 * route, which stores nothing (explicit-save ticket 11).
 *
 * @param {{
 *   galleryId: number,
 *   galleryType: string,
 *   storeRef: import('react').MutableRefObject<import('@reduxjs/toolkit').Store|null>,
 *   contentBlockEdit: { storeIndex: number, row: Record<string, unknown> } | null,
 *   setContentBlockEdit: (value: { storeIndex: number, row: Record<string, unknown> } | null) => void,
 *   saveMetaModalReturnFocus: () => void,
 *   setMetaModalStoreIndex: (idx: number | null) => void,
 * }} args
 */
export function usePreviewItemAdminActions({
	galleryId,
	galleryType,
	storeRef,
	contentBlockEdit,
	setContentBlockEdit,
	saveMetaModalReturnFocus,
	setMetaModalStoreIndex: _setMetaModalStoreIndex,
}) {
	const itemEditSidebar = useGalleryItemEditSidebar();
	const { form, undoRedo } = useGallerySettingsFormBundle();
	const toast = useTakeoverToast();
	const {
		adoptLayoutCheckpoint,
		commitLayoutStep,
		registerLayoutApplier,
		commitItemsStep,
		registerItemsApplier,
		currentStepId,
		undo,
	} = undoRedo;
	const offerRemovalUndo = useUndoToastOffer({ undo, currentStepId });

	useEffect(() => {
		return registerLayoutApplier((layout) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const core = asGalleryItemList(st.getState().items.items);
			commitPreviewCatalog(
				st,
				restoreCatalogFromLayoutHistory(core, layout)
			);
		});
	}, [registerLayoutApplier, storeRef]);

	useEffect(() => {
		return registerItemsApplier((op) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const next = applyGalleryItemHistoryOp(
				asGalleryItemList(st.getState().items.items),
				op
			);
			if (!next) {
				return;
			}
			// Store indices shift, so an open Image panel or a kept selection
			// would point at a neighbour.
			if (
				itemEditSidebar &&
				(itemEditSidebar.storeIndex !== null ||
					itemEditSidebar.selectedIndex !== null)
			) {
				itemEditSidebar.close();
			}
			commitPreviewCatalog(st, reanchorEmbeddedRowsInMergedList(next));
		});
	}, [itemEditSidebar, registerItemsApplier, storeRef]);

	/*
	 * The layout buffers a drag or resize and writes the store only on
	 * release, so a save during the gesture stores the state before it.
	 */
	const onCustomGridLayoutInteractionStart = useCallback(
		(_args) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const core = asGalleryItemList(st.getState().items.items);
			adoptLayoutCheckpoint(snapshotCustomGridItemCells(core));
		},
		[adoptLayoutCheckpoint, storeRef]
	);

	const onCustomGridLayoutCommit = useCallback(
		({ kind }) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const core = asGalleryItemList(st.getState().items.items);
			commitCustomGridLayoutHistoryStep(
				{ commitLayoutStep },
				{ kind, catalog: core }
			);
		},
		[commitLayoutStep, storeRef]
	);

	/**
	 * Remove at once and send nothing: the editor save stores the removal
	 * (ADR 0059). It is a history step, with Undo in a toast.
	 *
	 * @param {number} storeIndex
	 */
	const requestRemoveItem = useCallback(
		(storeIndex) => {
			const st = storeRef.current;
			if (!st) {
				return;
			}
			const itemsSnap = st.getState().items.items;
			const row = itemsSnap[storeIndex];
			if (!row || isTemplateProtectedEmbeddedRow(row, galleryType)) {
				return;
			}
			const change = buildItemRemovalChange(
				asGalleryItemList(itemsSnap),
				storeIndexToCoreIndex(itemsSnap, storeIndex)
			);
			if (!change) {
				return;
			}
			const wasEditingThis =
				itemEditSidebar?.storeIndex !== null &&
				itemEditSidebar?.storeIndex === storeIndex;
			// The panel follows to the next image; a content block has none.
			const nextStoreIndex =
				wasEditingThis && !isEmbeddedGalleryItemRow(row)
					? getNextImageStoreIndexAfterRemove(itemsSnap, storeIndex)
					: null;
			removePreviewItemAtStoreIndex(st, storeIndex);
			settleSelectionAfterRemoval(
				itemEditSidebar,
				wasEditingThis,
				nextStoreIndex
			);
			const copy = describeRemovedItem(change.row);
			const stepId = commitItemsStep({ label: copy.stepLabel, change });
			offerRemovalUndo(stepId, copy);
		},
		[
			commitItemsStep,
			galleryType,
			itemEditSidebar,
			offerRemovalUndo,
			storeRef,
		]
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
						// Shown once the route answers; stored by the editor save.
						const replaced =
							await replaceAttachmentsInPreviewCatalog({
								store: st,
								galleryId,
								replacements: toReplace.map((sel, i) => ({
									storeIndex: indices[i],
									attachmentId: Number(sel.id),
								})),
								layout: workingTileLayout(form.state.values),
								commitItemsStep,
							});
						didReplace = replaced > 0;
					} catch (e) {
						toast?.show({
							message:
								e?.message ||
								__(
									'Could not replace the image.',
									'modula-best-grid-gallery'
								),
							tone: 'error',
						});
					} finally {
						finish(didReplace);
					}
				});

				frame.open();
			});
		},
		[commitItemsStep, form, galleryId, storeRef, toast]
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
			const beforeCells = snapshotCustomGridItemCells([prev]);
			adoptLayoutCheckpoint(beforeCells);
			const nextLocked = !isGridItemLocked(prev);
			core[coreIndex] = {
				...prev,
				gridLocked: nextLocked ? 1 : 0,
			};
			commitPreviewCatalog(st, core);
			const galleryItemId = previewItemRowLookupKey(prev);
			if (galleryItemId !== undefined && galleryItemId !== null) {
				commitCustomGridLockHistoryStep(
					{ commitLayoutStep },
					{
						locked: nextLocked,
						galleryItemId,
						catalog: core,
					}
				);
			}
		},
		[adoptLayoutCheckpoint, commitLayoutStep, storeRef]
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

	// A content block edit changes the store; the editor save stores it.
	const handleSaveContentBlock = useCallback(
		(fields) => {
			if (!contentBlockEdit) {
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
			commitPreviewCatalog(st, reanchorEmbeddedRowsInMergedList(next));
			setContentBlockEdit(null);
		},
		[contentBlockEdit, setContentBlockEdit, storeRef]
	);

	const moveItemToPreviousPage = useCallback(
		(storeIndex) => {
			const st = storeRef.current;
			if (st) {
				movePreviewItemToAdjacentPage(st, storeIndex, 'previous');
			}
		},
		[storeRef]
	);

	const moveItemToNextPage = useCallback(
		(storeIndex) => {
			const st = storeRef.current;
			if (st) {
				movePreviewItemToAdjacentPage(st, storeIndex, 'next');
			}
		},
		[storeRef]
	);

	const previewAdminValue = useMemo(() => {
		const adminActions = {
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
			onCustomGridLayoutInteractionStart:
				galleryType === 'custom-grid'
					? onCustomGridLayoutInteractionStart
					: undefined,
			onCustomGridLayoutCommit:
				galleryType === 'custom-grid'
					? onCustomGridLayoutCommit
					: undefined,
			selectItem: (idx) => itemEditSidebar?.select(idx),
			// Double-click runs the tile toolbar's Edit (same panel, same `open`).
			openItem: (idx) => {
				const row = storeRef.current?.getState().items.items[idx];
				if (!row) {
					return;
				}
				selectedTileActions(
					row,
					idx,
					galleryType,
					adminActions
				).edit?.onClick();
			},
			isItemSelected: (idx) =>
				itemEditSidebar?.selectedIndex !== null &&
				itemEditSidebar?.selectedIndex === idx,
			SelectedTileToolbar,
		};
		return adminActions;
	}, [
		galleryType,
		openReplaceMedia,
		requestRemoveItem,
		toggleGridItemLock,
		openEditContentBlock,
		moveItemToPreviousPage,
		moveItemToNextPage,
		onCustomGridLayoutInteractionStart,
		onCustomGridLayoutCommit,
		saveMetaModalReturnFocus,
		itemEditSidebar,
		storeRef,
	]);

	return {
		handleSaveContentBlock,
		previewAdminValue,
	};
}
