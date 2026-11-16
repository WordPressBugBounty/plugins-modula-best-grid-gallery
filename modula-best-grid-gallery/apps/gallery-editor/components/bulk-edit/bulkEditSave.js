/**
 * Bulk-edit drafts: compare them with the preview store and apply them to it.
 */
import {
	asGalleryItemList,
	commitPreviewCatalog,
} from 'gallery-shared/preview';
import { mergeFilterTagsIntoList } from 'editor-shell/logic';
import {
	isEmbeddedGalleryItemRow,
	reanchorEmbeddedRowsInMergedList,
} from '../../utils/embeddedGalleryItems';
import {
	ITEM_CSS_CLASS_KEY,
	sanitizeItemCssClass,
} from '../../utils/galleryItemFields';
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
 * @param {import('@reduxjs/toolkit').Store|null}   [store]
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
 * @param {Object}                                  row
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
 * The draft as the item save expects it: filters comma-separated, CSS
 * classes as valid space-separated tokens.
 *
 * @param {Record<string, unknown>} changes
 * @return {Record<string, unknown>} Normalized draft fields.
 */
export function normalizeDraftFields(changes) {
	const out = { ...changes };
	if (Object.prototype.hasOwnProperty.call(out, ITEM_CSS_CLASS_KEY)) {
		out[ITEM_CSS_CLASS_KEY] = sanitizeItemCssClass(out[ITEM_CSS_CLASS_KEY]);
	}
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
 * One row with its draft applied. The canvas reads the caption from
 * `caption`; the items save stores `description`.
 *
 * @param {Object}                  row
 * @param {Record<string, unknown>} changes
 * @return {Object} The edited row.
 */
function applyDraftToRow(row, changes) {
	const fields = normalizeDraftFields(changes);
	const next = { ...row, ...fields };
	if (Object.prototype.hasOwnProperty.call(fields, 'description')) {
		next.caption = fields.description;
	}
	return next;
}

/**
 * The catalog with the draft applied and the excluded images left out.
 *
 * @param {Object[]}                                items         Preview catalog.
 * @param {Record<string, Record<string, unknown>>} localChanges  Keyed by row key.
 * @param {Set<string>}                             excludeRowIds Row keys to remove.
 * @return {Object[]} Catalog rows in display order.
 */
function applyBulkEditDraftToCatalog(items, localChanges, excludeRowIds) {
	// Bulk edit lists images only: content blocks and shortcodes stay as they are.
	const draftKey = (row) =>
		isEmbeddedGalleryItemRow(row) ? '' : bulkEditRowKey(row);
	const rows = items
		.filter((row) => !excludeRowIds.has(draftKey(row)))
		.map((row) => {
			const changes = localChanges[draftKey(row)];
			return changes ? applyDraftToRow(row, changes) : row;
		});

	return reanchorEmbeddedRowsInMergedList(rows);
}

/**
 * Collect unique filter tokens from rows + drafts for gallery-level filter list.
 *
 * @param {Object[]}                                items
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
 * @param {string[]}                                            newTags
 */
export function mergeTagsIntoGalleryFilterSettings(form, newTags) {
	const list = mergeFilterTagsIntoList(
		form.state.values?.filters?.filters,
		newTags
	);
	if (list) {
		form.setFieldValue(['filters', 'filters'], list);
	}
}

/**
 * Apply the draft to the preview store, leaving out the excluded images, and
 * add new filter names to the gallery's filter list. Nothing is sent: the
 * editor save stores the items and the settings (ADR 0059).
 *
 * @param {{
 *   store: import('@reduxjs/toolkit').Store,
 *   localChanges: Record<string, Record<string, unknown>>,
 *   form?: import('@tanstack/react-form').ReactFormExtendedApi,
 *   excludeAttachmentIds?: Set<string>,
 * }} args
 */
export function commitBulkEditDraft({
	store,
	localChanges,
	form,
	excludeAttachmentIds = new Set(),
}) {
	const sourceItems = asGalleryItemList(store.getState().items.items);
	const catalog = applyBulkEditDraftToCatalog(
		sourceItems,
		localChanges,
		excludeAttachmentIds
	);

	if (form) {
		const tags = collectNewFilterTagsFromDraft(sourceItems, localChanges);
		mergeTagsIntoGalleryFilterSettings(form, tags);
	}

	commitPreviewCatalog(store, catalog);
}
