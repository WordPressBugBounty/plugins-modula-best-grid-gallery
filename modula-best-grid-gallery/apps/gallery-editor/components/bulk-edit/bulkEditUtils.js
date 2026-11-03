/**
 * Helpers for bulk-edit rows and filter token parsing.
 */
import { asGalleryItemList } from 'gallery-shared/preview';
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
 * @param {Object[]}                rows         Rows from `buildBulkEditRowsWithIndices`.
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

// An image's filter tags and the gallery's filter names: editor-shell's
// rules, shared with the Albums editor's members.
export {
	parseFilterTags as parseFiltersField,
	formatFilterTags as filtersFieldToString,
	filterListNames as galleryFilterSuggestions,
} from 'editor-shell/logic';

/**
 * @param {Record<string, unknown>} editor
 * @return {boolean}
 */
export function hasBulkEditFiltersColumn(editor) {
	return resolveProGateLock({ kind: 'requiresPro' }, editor).allowed;
}

/**
 * Watermark (an extension) is offered when it is active and Pro has
 * registered its action button.
 *
 * @param {Record<string, unknown>} editor
 * @param {{ ActionButton?: unknown }|null} watermarkRegistration
 * @return {boolean}
 */
export function hasBulkEditWatermarkAction(editor, watermarkRegistration) {
	return (
		resolveProGateLock(
			{ kind: 'requiresExtension', extensionSlug: 'modula-watermark' },
			editor
		).allowed && Boolean(watermarkRegistration?.ActionButton)
	);
}

/**
 * Attachments the watermark action applies to: the ticked rows, or every
 * row in the dialog when none is ticked (the dialog then holds the canvas
 * selection it opened with, or the whole gallery).
 *
 * @param {Object[]} rows        Rows shown in the dialog.
 * @param {string[]} selectedIds Ticked row keys.
 * @return {number[]} Unique attachment ids, in row order.
 */
export function bulkEditWatermarkTargetIds(rows, selectedIds) {
	const ticked = new Set(selectedIds);
	const targets = ticked.size
		? rows.filter((row) => ticked.has(bulkEditRowKey(row)))
		: rows;
	const ids = targets.map(bulkEditNumericAttachmentId).filter((id) => id > 0);
	return [...new Set(ids)];
}

/**
 * @param {string} url
 * @return {string}
 */
/**
 * HTML caption for bulk-edit WYSIWYG (draft wins; keep markup from gallery row).
 *
 * @param {Object}                                  row
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
	if (row?.src) {
		return String(row.src);
	}
	if (row?.thumbnail) {
		return String(row.thumbnail);
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
