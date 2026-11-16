/**
 * The canvas Sort popover's sort mode and the Reorder dialog. Both change the
 * preview store only: the catalog order and the working sort mode are
 * unsaved changes of the gallery's items until the editor save (ADR 0059).
 */
import {
	asGalleryItemList,
	commitPreviewCatalog,
	normalizeGalleryItemLookupString,
} from 'gallery-shared/preview';
import {
	useCallback,
	useState,
	useSyncExternalStore,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useReorderDraft, useTakeoverToast } from 'editor-shell';
import { useGalleryItemEditSidebar } from '../context/GalleryItemEditSidebarContext';
import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';
import {
	bootstrapRowsForSorting,
	computeSortedAttachmentOrder,
	fetchAttachmentSortFields,
	isGallerySortMode,
} from '../utils/gallerySortingApply';
import { getSortingMenuDefinition } from '../utils/gallerySortingMenuDefinition';
import {
	isContentBlockGalleryItemRow,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { buildGalleryReorderRows } from '../components/gallery-reorder/buildGalleryReorderRows';
import {
	getGalleryPreviewReduxStore,
	subscribeGalleryPreviewReduxStore,
} from '../utils/previewReduxStoreRef';
import {
	reorderCoreItemsByAttachmentIds,
	stripStaleModulaRowIndex,
} from '../utils/previewItemsCommit';
import {
	readPreviewSortingMode,
	setPreviewSortingMode,
} from '../utils/previewSortingMode';

/**
 * Commit a new catalog order and sort mode to the preview store.
 *
 * `modulaRowIndex` is a row's position in the stored `modula-images` at
 * bootstrap. After a reorder it no longer matches the canvas; the writes that
 * still go by row index store the unsaved items first, so the display order
 * is the stored order they target.
 *
 * @param {import('@reduxjs/toolkit').Store} store       Preview store.
 * @param {Object[]}                         rows        Catalog rows in the new order.
 * @param {string}                           sortingMode Sort mode.
 */
function commitPreviewOrder(store, rows, sortingMode) {
	commitPreviewCatalog(
		store,
		stripStaleModulaRowIndex(reanchorEmbeddedRowsInMergedList(rows))
	);
	setPreviewSortingMode(store, sortingMode);
}

/** @return {string} The working sort mode, re-read on every store change. */
function usePreviewSortingMode() {
	const store = useSyncExternalStore(
		subscribeGalleryPreviewReduxStore,
		getGalleryPreviewReduxStore
	);
	const subscribe = useCallback(
		(onChange) => (store ? store.subscribe(onChange) : () => {}),
		[store]
	);
	return useSyncExternalStore(subscribe, () => readPreviewSortingMode(store));
}

/**
 * The gallery's sort mode (the canvas toolbar's Sort popover).
 * `onManualSorting` runs once "Drag and drop reorder" is chosen; it opens the
 * Reorder view.
 *
 * @param {{ galleryId: number, onManualSorting: () => void }} args
 */
export function useGallerySortMode({ galleryId, onManualSorting }) {
	const editor = useModulaSettingsEditorConfig();
	const pro = Boolean(editor.isPro);
	const currentMode = usePreviewSortingMode();
	const toast = useTakeoverToast();

	/**
	 * Sort the canvas for `mode`. Only the attachments' dates and titles are
	 * read from the server; the order is computed here.
	 */
	const applySortMode = useCallback(async (mode) => {
		const store = getGalleryPreviewReduxStore();
		if (!store || !isGallerySortMode(mode)) {
			return;
		}
		if (mode === 'manual') {
			setPreviewSortingMode(store, mode);
			return;
		}
		const catalog = asGalleryItemList(store.getState().items.items);
		const imageRows = bootstrapRowsForSorting(catalog);
		const media = await fetchAttachmentSortFields(
			imageRows.map((r) => r.id)
		);
		const order = computeSortedAttachmentOrder(imageRows, mode, media);
		// The catalog may have changed while the dates and titles loaded.
		const latest = asGalleryItemList(store.getState().items.items);
		commitPreviewOrder(
			store,
			reorderCoreItemsByAttachmentIds(latest, order),
			mode
		);
	}, []);

	const handleSortOptionClick = useCallback(
		(rowId) => {
			if (!pro || !galleryId || !isGallerySortMode(rowId)) {
				return;
			}
			const applied = applySortMode(rowId);
			const done =
				rowId === 'manual' ? applied.then(onManualSorting) : applied;
			// The mode is unchanged and the canvas keeps its order: say why.
			done.catch((error) => {
				toast?.show({
					message: sprintf(
						/* translators: %s: the error message. */
						__(
							'Could not sort the images: %s',
							'modula-best-grid-gallery'
						),
						error?.message ||
							__('Unknown error', 'modula-best-grid-gallery')
					),
					tone: 'error',
				});
			});
		},
		[applySortMode, galleryId, onManualSorting, pro, toast]
	);

	return {
		currentMode,
		sortRows: getSortingMenuDefinition(),
		handleSortOptionClick,
	};
}

/**
 * The Reorder dialog: the draft order (drag or arrows) over the canvas's
 * current catalog. `onClose` closes the dialog; the draft goes with it.
 *
 * @param {{ onClose: () => void }} args
 */
export function useGalleryReorderController({ onClose }) {
	const itemEditSidebar = useGalleryItemEditSidebar();

	// Read when the dialog opens: the canvas cannot change behind the modal.
	const [rows] = useState(() => {
		const store = getGalleryPreviewReduxStore();
		const items = store
			? asGalleryItemList(store.getState().items.items)
			: [];
		return buildGalleryReorderRows({ items });
	});

	const { orderedRows, onDragEnd, moveOrderKey } = useReorderDraft(rows);

	const applyManualOrder = useCallback(() => {
		const store = getGalleryPreviewReduxStore();
		const ordered = orderedRows
			.map((r) => (r.rawRow ? { ...r.rawRow } : null))
			.filter(Boolean);
		if (!store || !ordered.length) {
			return;
		}
		commitPreviewOrder(store, ordered, 'manual');
	}, [orderedRows]);

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
