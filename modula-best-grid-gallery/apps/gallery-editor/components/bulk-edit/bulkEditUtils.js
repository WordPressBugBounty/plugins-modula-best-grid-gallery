/**
 * Helpers for bulk-edit rows and filter token parsing.
 */
import {
	asGalleryItemList,
} from 'gallery-shared/preview';
import { isEmbeddedGalleryItemRow } from '../../utils/embeddedGalleryItems';
import { captionToPlainString } from '../../utils/captionToPlainString';
import { resolveProGateLock } from '../../logic/proGateLock';

/**
 * Stable draft/selection key for a gallery row.
 * Supports numeric attachment IDs and string video template ids (`video_template_N`).
 *
 * @param {Object|string|number|null|undefined} rowOrId
 * @return {string}
 */
export function bulkEditRowKey(rowOrId) {
	if (rowOrId && typeof rowOrId === 'object') {
		return String(rowOrId.id ?? '').trim();
	}
	return String(rowOrId ?? '').trim();
}

/**
 * WordPress attachment ID when the row is media-backed; otherwise 0.
 *
 * @param {Object|null|undefined} row
 * @return {number}
 */
export function bulkEditNumericAttachmentId(row) {
	const n = Number(row?.id);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * @param {import('@reduxjs/toolkit').Store|null} store
 * @return {Object[]}
 */
export function getBulkEditSourceItems(store) {
	if (!store) {
		return [];
	}
	return asGalleryItemList(store.getState().items.items);
}

/**
 * Image rows only (no content blocks / shortcodes).
 *
 * @param {Object[]} items
 * @return {Object[]}
 */
export function filterBulkEditableImageRows(items) {
	return items.filter(
		(row) => row && !isEmbeddedGalleryItemRow(row) && row.id
	);
}

/**
 * Restrict bulk-edit rows to preview-selected store indices.
 * Empty / missing indices means show every bulk-editable image.
 *
 * @param {Object[]} rows Rows from `buildBulkEditRowsWithIndices`.
 * @param {number[]|null|undefined} storeIndices Snapshot of selected store indices.
 * @return {Object[]}
 */
export function filterBulkEditRowsByStoreIndices(rows, storeIndices) {
	if (!Array.isArray(rows) || rows.length === 0) {
		return [];
	}
	if (!Array.isArray(storeIndices) || storeIndices.length === 0) {
		return rows;
	}
	const allowed = new Set(storeIndices);
	return rows.filter((row) => allowed.has(row.__storeIndex));
}

/**
 * @param {unknown} filters
 * @return {string[]}
 */
export function parseFiltersField(filters) {
	if (Array.isArray(filters)) {
		return filters.map((t) => String(t).trim()).filter(Boolean);
	}
	if (typeof filters === 'string') {
		return filters
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}
	return [];
}

/**
 * @param {unknown} filters
 * @return {string}
 */
export function filtersFieldToString(filters) {
	if (Array.isArray(filters)) {
		return filters
			.map((t) => String(t).trim())
			.filter(Boolean)
			.join(',');
	}
	return typeof filters === 'string' ? filters : '';
}

/**
 * @param {Record<string, unknown>} editor
 * @return {boolean}
 */
export function hasBulkEditFiltersColumn(editor) {
	return resolveProGateLock({ kind: 'requiresPro' }, editor).allowed;
}

/**
 * Gallery-level filter name suggestions for FormTokenField.
 *
 * @param {unknown} filtersArr `filters.filters` from form values.
 * @return {string[]}
 */
export function galleryFilterSuggestions(filtersArr) {
	const raw = Array.isArray(filtersArr) ? filtersArr : [];
	return raw.map((t) => String(t).trim()).filter(Boolean);
}

/**
 * @param {string} url
 * @return {string}
 */
/**
 * HTML caption for bulk-edit WYSIWYG (draft wins; keep markup from gallery row).
 *
 * @param {Object} row
 * @param {(row: Object, field: string) => unknown} getRowField
 * @return {string}
 */
export function bulkEditDescriptionHtml(row, getRowField) {
	const draft = getRowField(row, 'description');
	if (draft !== undefined && draft !== null) {
		return String(draft);
	}
	const raw = row?.description ?? row?.caption ?? '';
	if (typeof raw === 'string') {
		return raw;
	}
	return captionToPlainString(raw) || '';
}

export function bulkEditThumbUrl(row) {
	if (row?.video_thumbnail) {
		return String(row.video_thumbnail);
	}
	if (row?.thumbUrl) {
		return String(row.thumbUrl);
	}
	if (row?.url) {
		return String(row.url);
	}
	return '';
}

/**
 * Short filename label for bulk-edit image column.
 *
 * @param {Object} row Gallery item row.
 * @return {string}
 */
export function bulkEditFilename(row) {
	const direct = row?.filename || row?.name || '';
	if (typeof direct === 'string' && direct.trim()) {
		return direct.trim();
	}
	const url = bulkEditThumbUrl(row);
	if (!url) {
		return '';
	}
	try {
		const path = new URL(url, 'https://example.invalid').pathname;
		const base = path.split('/').filter(Boolean).pop();
		return base ? decodeURIComponent(base) : '';
	} catch {
		const parts = String(url).split('/');
		return parts[parts.length - 1] || '';
	}
}
