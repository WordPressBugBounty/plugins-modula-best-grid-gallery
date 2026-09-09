/**
 * Persist bulk-edit drafts via v2 REST (no Backbone).
 */
import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { saveMergedGalleryItems } from '../../api/galleryUploadApi';
import {
	isEmbeddedGalleryItemRow,
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../../utils/embeddedGalleryItems';
import { commitPreviewCatalog } from '../../utils/previewItemsCommit';
import {
	bulkEditRowKey,
	filtersFieldToString,
	parseFiltersField,
} from './bulkEditUtils';

/**
 * @param {Object}  row
 * @param {string}  field
 * @param {unknown} draftVal
 * @return {boolean}
 */
function bulkEditDraftFieldDiffers(row, field, draftVal) {
	if (field === 'filters') {
		return (
			filtersFieldToString(draftVal) !== filtersFieldToString(row.filters)
		);
	}
	if (field === 'description') {
		const rowDesc = row.description ?? row.caption ?? '';
		return String(draftVal ?? '') !== String(rowDesc ?? '');
	}
	return String(draftVal ?? '') !== String(row[field] ?? '');
}

/**
 * True when any draft field still differs from the live preview store row.
 *
 * @param {Record<string, Record<string, unknown>>} localChanges keyed by row id string
 * @param {import('@reduxjs/toolkit').Store|null} [store]
 * @return {boolean}
 */
export function bulkEditHasDraftChanges(localChanges, store = null) {
	const keys = Object.keys(localChanges);
	if (keys.length === 0) {
		return false;
	}
	if (!store) {
		return true;
	}

	const items = asGalleryItemList(store.getState().items.items);
	/** @type {Map<string, Object>} */
	const rowById = new Map();
	for (const row of items) {
		if (isEmbeddedGalleryItemRow(row)) {
			continue;
		}
		const key = bulkEditRowKey(row);
		if (key) {
			rowById.set(key, row);
		}
	}

	for (const key of keys) {
		const patch = localChanges[key];
		if (!patch || typeof patch !== 'object') {
			continue;
		}
		const row = rowById.get(key);
		if (!row) {
			return true;
		}
		for (const field of Object.keys(patch)) {
			if (bulkEditDraftFieldDiffers(row, field, patch[field])) {
				return true;
			}
		}
	}

	return false;
}

/**
 * @param {Object} row
 * @param {Record<string, Record<string, unknown>>} localChanges
 * @return {boolean}
 */
export function bulkEditRowIsModified(row, localChanges) {
	const key = bulkEditRowKey(row);
	if (!key) {
		return false;
	}
	const patch = localChanges[key];
	if (!patch || typeof patch !== 'object') {
		return false;
	}
	for (const field of Object.keys(patch)) {
		if (bulkEditDraftFieldDiffers(row, field, patch[field])) {
			return true;
		}
	}
	return false;
}

/**
 * @param {Record<string, unknown>} changes
 */
function normalizeDraftFields(changes) {
	const out = { ...changes };
	if (Object.prototype.hasOwnProperty.call(out, 'filters')) {
		if (Array.isArray(out.filters)) {
			out.filters = out.filters
				.map((t) => String(t).trim())
				.filter(Boolean)
				.join(',');
		} else if (out.filters === null || out.filters === undefined) {
			out.filters = '';
		}
	}
	return out;
}

/**
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {Record<string, Record<string, unknown>>} localChanges
 * @param {Set<string>} [excludeRowIds]
 * @return {Object[]}
 */
export function buildBulkEditMergedPayload(
	store,
	localChanges,
	excludeRowIds = new Set()
) {
	const items = asGalleryItemList(store.getState().items.items);
	const merged = items
		.filter((row) => {
			if (isEmbeddedGalleryItemRow(row)) {
				return true;
			}
			const key = bulkEditRowKey(row);
			if (!key) {
				return true;
			}
			return !excludeRowIds.has(key);
		})
		.map((row) => {
			if (isEmbeddedGalleryItemRow(row)) {
				return { ...row };
			}
			const key = bulkEditRowKey(row);
			const changes = key ? localChanges[key] : undefined;
			if (!changes) {
				return { ...row };
			}
			return { ...row, ...normalizeDraftFields(changes) };
		});

	return reanchorEmbeddedRowsInMergedList(
		previewCoreItemsToSaveMergedPayload(merged)
	);
}

/**
 * Collect unique filter tokens from rows + drafts for gallery-level filter list.
 *
 * @param {Object[]} items
 * @param {Record<string, Record<string, unknown>>} localChanges
 * @return {string[]}
 */
export function collectNewFilterTagsFromDraft(items, localChanges) {
	const tags = new Set();
	for (const row of items) {
		if (isEmbeddedGalleryItemRow(row)) {
			continue;
		}
		const key = bulkEditRowKey(row);
		const raw =
			key && localChanges[key]?.filters !== undefined
				? localChanges[key].filters
				: row.filters;
		parseFiltersField(raw).forEach((t) => tags.add(t));
	}
	return [...tags];
}

/**
 * @param {import('@tanstack/react-form').ReactFormExtendedApi} form
 * @param {string[]} newTags
 */
export function mergeTagsIntoGalleryFilterSettings(form, newTags) {
	if (!newTags.length) {
		return;
	}
	const current = form.state.values?.filters?.filters;
	const list = Array.isArray(current) ? [...current] : [];
	let changed = false;
	for (const tag of newTags) {
		const t = String(tag).trim();
		if (t && !list.includes(t)) {
			list.push(t);
			changed = true;
		}
	}
	if (changed) {
		form.setFieldValue(['filters', 'filters'], list);
	}
}

/**
 * @param {{
 *   galleryId: number,
 *   store: import('@reduxjs/toolkit').Store,
 *   localChanges: Record<string, Record<string, unknown>>,
 *   form?: import('@tanstack/react-form').ReactFormExtendedApi,
 *   excludeAttachmentIds?: Set<string>,
 * }} args
 */
export async function persistBulkEditDraft({
	galleryId,
	store,
	localChanges,
	form,
	excludeAttachmentIds = new Set(),
}) {
	const sourceItems = asGalleryItemList(store.getState().items.items);
	const payload = buildBulkEditMergedPayload(
		store,
		localChanges,
		excludeAttachmentIds
	);
	await saveMergedGalleryItems(galleryId, payload);

	if (form) {
		const tags = collectNewFilterTagsFromDraft(sourceItems, localChanges);
		mergeTagsIntoGalleryFilterSettings(form, tags);
	}

	commitPreviewCatalog(store, payload);

	return payload;
}
