import { asGalleryItemList } from 'gallery-shared/preview';
import { useMemo } from '@wordpress/element';
import {
	buildNewContentBlockRow,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { commitPreviewCatalog } from '../utils/previewItemsCommit';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import {
	getAddMediaDialogTab,
	getAddNewMenuDefinition,
	getTakeoverAddNewMenuDefinition,
	getTakeoverVideoGalleryAddNewMenuDefinition,
	triggerAddNewRow,
} from '../utils/takeoverAddNewMenuModel';
import {
	filterAddNewRowsForBoundGallery,
	getBoundGallerySummaryFromEditor,
} from '../utils/boundGalleryChromePolicy';
import { openTakeoverVideoMediaLibrary } from '../utils/openTakeoverVideoMediaLibrary';
import { useGalleryEditorChanges } from './useGalleryEditorChanges';
import { resolveTakeoverPrimaryAddNewAction } from '../utils/resolveTakeoverPrimaryAddNewAction';

const PREVIEW_IMPORT_REACT_FLOWS = new Set([
	'folder',
	'zip',
	'content-galleries',
	'instagram',
	'video',
	'video-playlist',
]);

/**
 * Add New split-menu model + action handlers (takeover/classic paths).
 *
 * @param {{
 *   editor: Record<string, unknown>,
 *   galleryId: number,
 *   uploadPosition: 'start' | 'end',
 *   onOpenPreviewImport?: (reactFlow: 'folder' | 'zip' | 'content-galleries' | 'instagram' | 'video' | 'video-playlist') => void,
 *   onOpenAddMedia?: (tab: 'upload' | 'library') => void,
 *   onLibraryAdded?: () => void,
 *   onLibraryError?: (msg: string) => void,
 *   galleryType?: string,
 * }} args `onOpenAddMedia` opens the Add media dialog (takeover only).
 */
export function useTakeoverPreviewAddNewMenu({
	editor,
	galleryId,
	uploadPosition,
	onOpenPreviewImport,
	onOpenAddMedia,
	onLibraryAdded,
	onLibraryError,
	galleryType = '',
}) {
	const isVideoGallery = galleryType === 'video';
	const editorChanges = useGalleryEditorChanges();
	const boundSummary = getBoundGallerySummaryFromEditor(editor);

	const rows = useMemo(() => {
		let next;
		if (!editor.takeover) {
			next = getAddNewMenuDefinition().filter(
				(row) => row.reactFlow !== 'content-block' || editor.takeover
			);
		} else {
			next = isVideoGallery
				? getTakeoverVideoGalleryAddNewMenuDefinition()
				: getTakeoverAddNewMenuDefinition();
		}
		return filterAddNewRowsForBoundGallery(next, boundSummary);
	}, [boundSummary, editor, isVideoGallery]);

	const openVideoLibraryPicker = () => {
		if (!galleryId) {
			return;
		}
		openTakeoverVideoMediaLibrary({
			galleryId,
			uploadPosition,
			// The picked videos become unsaved changes (Lite 3.0.21, Pro 3.0.24).
			addItems: editorChanges.addItems,
			onSuccess: () => onLibraryAdded?.(),
			onError: (msg) => onLibraryError?.(msg),
		});
	};

	const createContentBlock = () => {
		if (!galleryId) {
			return;
		}
		const st = getGalleryPreviewReduxStore();
		if (!st) {
			return;
		}
		const core = asGalleryItemList(st.getState().items.items);
		const insertStart = uploadPosition === 'start';
		const newRow = buildNewContentBlockRow(core, {
			position: insertStart ? 'start' : 'end',
		});
		const next = insertStart ? [newRow, ...core] : [...core, newRow];
		// On the canvas at once; the editor save stores it (ADR 0059).
		commitPreviewCatalog(st, reanchorEmbeddedRowsInMergedList(next));
	};

	const handlePrimaryAddNew = () => {
		const action = resolveTakeoverPrimaryAddNewAction({
			boundSummary,
			galleryType,
		});
		if (action === 'content-block') {
			createContentBlock();
			return;
		}
		if (!editor.takeover || !galleryId) {
			return;
		}
		if (action === 'video-library') {
			openVideoLibraryPicker();
			return;
		}
		onOpenAddMedia?.('library');
	};

	const handleRowAction = (row) => {
		if (editor.takeover && isVideoGallery && row.id === 'library') {
			openVideoLibraryPicker();
			return;
		}
		if (
			editor.takeover &&
			row.reactFlow &&
			PREVIEW_IMPORT_REACT_FLOWS.has(row.reactFlow)
		) {
			onOpenPreviewImport?.(
				/** @type {'folder' | 'zip' | 'content-galleries' | 'instagram' | 'video' | 'video-playlist'} */ (
					row.reactFlow
				)
			);
			return;
		}
		const addMediaTab = getAddMediaDialogTab(row);
		if (editor.takeover && addMediaTab && galleryId) {
			onOpenAddMedia?.(addMediaTab);
			return;
		}
		if (editor.takeover && row.reactFlow === 'content-block' && galleryId) {
			createContentBlock();
			return;
		}
		if (!editor.takeover) {
			triggerAddNewRow(row);
		}
	};

	return {
		rows,
		handleRowAction,
		handlePrimaryAddNew,
	};
}
