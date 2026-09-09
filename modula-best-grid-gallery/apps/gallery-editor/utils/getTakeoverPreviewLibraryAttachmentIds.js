/**
 * Attachment IDs for images (and other file rows) currently in the takeover live preview.
 * Used to pre-check items in `wp.media` (“Add from library”) like the legacy metabox.
 */
import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { isEmbeddedGalleryItemRow } from './embeddedGalleryItems';
import { getGalleryPreviewReduxStore } from './previewReduxStoreRef';

/**
 * @return {number[]} Positive attachment IDs in preview order (deduped for wp.media selection).
 */
export function getTakeoverPreviewLibraryAttachmentIds() {
	const st = getGalleryPreviewReduxStore();
	if (!st) {
		return [];
	}
	const items = asGalleryItemList(st.getState().items.items);
	/** @type {number[]} */
	const ordered = [];
	for (const row of items) {
		if (isEmbeddedGalleryItemRow(row)) {
			continue;
		}
		const id = Number(row?.id);
		if (Number.isFinite(id) && id > 0) {
			ordered.push(id);
		}
	}
	return [...new Set(ordered)];
}
