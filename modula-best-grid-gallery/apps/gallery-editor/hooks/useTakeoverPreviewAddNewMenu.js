import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { useMemo } from '@wordpress/element';
import {
	buildNewContentBlockRow,
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { commitPreviewCatalog } from '../utils/previewItemsCommit';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import { saveMergedGalleryItems } from '../api/galleryUploadApi';
import {
	getAddNewMenuDefinition,
	getTakeoverAddNewMenuDefinition,
	getTakeoverVideoGalleryAddNewMenuDefinition,
	triggerAddNewRow,
} from '../utils/takeoverAddNewMenuModel';
import {
	boundGalleryPrimaryAddNewAction,
	filterAddNewRowsForBoundGallery,
	getBoundGallerySummaryFromEditor,
} from '../utils/boundGalleryChromePolicy';
import { getTakeoverPreviewLibraryAttachmentIds } from '../utils/getTakeoverPreviewLibraryAttachmentIds';
import { openTakeoverMediaLibrary } from '../utils/openTakeoverMediaLibrary';
import { openTakeoverVideoMediaLibrary } from '../utils/openTakeoverVideoMediaLibrary';

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
 *   onTakeoverOpenUpload?: () => void,
 *   onLibraryAdded?: () => void,
 *   onLibraryError?: (msg: string) => void,
 *   runPersistTask?: (fn: () => void | Promise<void>) => Promise<void>,
 *   closeMenu: () => void,
 *   galleryType?: string,
 * }} args
 */
export function useTakeoverPreviewAddNewMenu({
	editor,
	galleryId,
	uploadPosition,
	onOpenPreviewImport,
	onTakeoverOpenUpload,
	onLibraryAdded,
	onLibraryError,
	runPersistTask,
	closeMenu,
	galleryType = '',
}) {
	const isVideoGallery = galleryType === 'video';
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
			runPersistTask,
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
		const reanchored = reanchorEmbeddedRowsInMergedList(next);
		void runPersistTask(async () => {
			return saveMergedGalleryItems(
				galleryId,
				previewCoreItemsToSaveMergedPayload(reanchored)
			);
		})
			.then(() => {
				commitPreviewCatalog(st, reanchored);
				onLibraryAdded?.();
			})
			.catch((err) => {
				const msg = err?.message || err?.data?.message || String(err);
				onLibraryError?.(msg);
			});
	};

	const handlePrimaryAddNew = () => {
		if (boundGalleryPrimaryAddNewAction(boundSummary) === 'content-block') {
			createContentBlock();
			return;
		}
		if (typeof onTakeoverOpenUpload === 'function') {
			onTakeoverOpenUpload();
		}
	};

	const handleRowAction = (row) => {
		if (editor.takeover && isVideoGallery && row.id === 'library') {
			closeMenu();
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
			closeMenu();
			return;
		}
		if (
			editor.takeover &&
			row.id === 'upload' &&
			galleryId &&
			typeof onTakeoverOpenUpload === 'function'
		) {
			closeMenu();
			onTakeoverOpenUpload();
			return;
		}
		if (editor.takeover && row.id === 'library' && galleryId) {
			closeMenu();
			openTakeoverMediaLibrary({
				galleryId,
				uploadPosition,
				runPersistTask,
				existingAttachmentIds: getTakeoverPreviewLibraryAttachmentIds(),
				onSuccess: () => onLibraryAdded?.(),
				onError: (msg) => onLibraryError?.(msg),
			});
			return;
		}
		if (editor.takeover && row.reactFlow === 'content-block' && galleryId) {
			closeMenu();
			createContentBlock();
			return;
		}
		if (!editor.takeover) {
			triggerAddNewRow(row);
		}
		closeMenu();
	};

	return {
		rows,
		handleRowAction,
		handlePrimaryAddNew,
	};
}
