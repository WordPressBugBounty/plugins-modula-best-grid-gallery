/**
 * Content block edits in the settings-column panel go into the preview store
 * as they are made. They are unsaved changes of the gallery's items until the
 * editor save stores the catalog (ADR 0059).
 */
import {
	asGalleryItemList,
	commitPreviewCatalog,
	normalizeGalleryItemLookupString,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useRef } from '@wordpress/element';
import {
	mergeContentBlockSaveFieldsIntoRow,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { contentBlockStateToSaveFields } from '../utils/contentBlockEditState';
import { isContentBlockEditDirty } from '../utils/galleryItemEditDirtyState';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';

/**
 * Apply content-block fields onto the matching embedded row (or append if missing).
 *
 * @param {Object[]} core
 * @param {string}   eidNorm
 * @param {Object}   fields
 * @param {Object}   [fallbackRow]
 * @return {Object[]} The catalog with the block's fields applied, embedded rows re-anchored.
 */
function applyContentBlockFieldsToCore(core, eidNorm, fields, fallbackRow) {
	let found = false;
	const next = core.map((r) => {
		if (
			normalizeGalleryItemLookupString(r.embeddedId || r.id) === eidNorm
		) {
			found = true;
			return mergeContentBlockSaveFieldsIntoRow(r, fields);
		}
		return r;
	});
	if (!found && fallbackRow) {
		next.push(mergeContentBlockSaveFieldsIntoRow(fallbackRow, fields));
	}
	return reanchorEmbeddedRowsInMergedList(next);
}

/**
 * @param {{
 *   item: Object|null,
 *   getSavePayload: () => Object|null|undefined,
 *   editSessionTick: number,
 *   enabled?: boolean,
 * }} args
 * @return {{ flush: () => Promise<void> }} `flush` applies edits not yet in the store (e.g. the caption editor's live body).
 */
export function useGalleryItemContentBlockEdits({
	item,
	getSavePayload,
	editSessionTick,
	enabled = true,
}) {
	const getSavePayloadRef = useRef(getSavePayload);
	getSavePayloadRef.current = getSavePayload;
	const itemRef = useRef(item);
	itemRef.current = item;

	const applyEdits = useCallback(() => {
		const store = getGalleryPreviewReduxStore();
		const row = itemRef.current;
		const payload = getSavePayloadRef.current?.();
		if (!enabled || !store || !row || !payload) {
			return;
		}
		const eidNorm = normalizeGalleryItemLookupString(
			row.embeddedId || row.id
		);
		if (!eidNorm) {
			return;
		}
		const core = asGalleryItemList(store.getState().items.items);
		const stored = core.find(
			(r) =>
				normalizeGalleryItemLookupString(r.embeddedId || r.id) ===
				eidNorm
		);
		if (!isContentBlockEditDirty(stored || row, () => payload)) {
			return;
		}
		commitPreviewCatalog(
			store,
			applyContentBlockFieldsToCore(
				core,
				eidNorm,
				contentBlockStateToSaveFields(payload),
				row
			)
		);
	}, [enabled]);

	useEffect(() => {
		if (editSessionTick !== 0) {
			applyEdits();
		}
	}, [editSessionTick, applyEdits]);

	const flush = useCallback(() => {
		applyEdits();
		return Promise.resolve();
	}, [applyEdits]);

	return { flush };
}
