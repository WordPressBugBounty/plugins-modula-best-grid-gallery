import { asGalleryItemList } from 'gallery-shared/preview';
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
	filterAddNewRowsForBoundGallery,
	getBoundGallerySummaryFromEditor,
} from '../utils/boundGalleryChromePolicy';
import { getTakeoverPreviewLibraryAttachmentIds } from '../utils/getTakeoverPreviewLibraryAttachmentIds';
import { openTakeoverMediaLibrary } from '../utils/openTakeoverMediaLibrary';
import { openTakeoverVideoMediaLibrary } from '../utils/openTakeoverVideoMediaLibrary';
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
 *   onTakeoverOpenUpload?: () => void,
 *   onLibraryAdded?: () => void,
 *   onLibraryError?: (msg: string) => void,
 *   runPersistTask?: (fn: () => void | Promise<void>) => Promise<void>,
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

	const openImageLibraryPicker = () => {
		if (!galleryId) {
			return;
		}
		openTakeoverMediaLibrary({
			galleryId,
			uploadPosition,
			runPersistTask,
			existingAttachmentIds: getTakeoverPreviewLibraryAttachmentIds(),
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
		}, 'gallery-add-content')
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
		openImageLibraryPicker();
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
		if (
			editor.takeover &&
			row.id === 'upload' &&
			galleryId &&
			typeof onTakeoverOpenUpload === 'function'
		) {
			onTakeoverOpenUpload();
			return;
		}
		if (editor.takeover && row.id === 'library' && galleryId) {
			openImageLibraryPicker();
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
