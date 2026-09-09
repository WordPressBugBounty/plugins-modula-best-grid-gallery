/**
 * Gallery item identity: row keys, lookup, and modula-images write indexes.
 *
 * @package
 */

import { isEmbeddedGalleryItemRow } from './embeddedGalleryItemKinds';

/**
 * @param {unknown} items Store or bootstrap list.
 * @return {Object[]} Shallow copy of gallery items.
 */
export function asGalleryItemList(items) {
	return Array.isArray(items) ? items.slice() : [];
}

/**
 * Map a store index to the catalog index (same list: gallery items only).
 *
 * @param {Array<Object>} items      List from Redux `items.items`.
 * @param {number}        storeIndex Linear index in the preview catalog.
 * @return {number} Catalog index, or -1 when invalid.
 */
export function storeIndexToCoreIndex(items, storeIndex) {
	if (!Array.isArray(items) || storeIndex < 0 || storeIndex >= items.length) {
		return -1;
	}
	return storeIndex;
}

/**
 * Whether a store row maps to a `modula-images` entry (attachments + video templates).
 * v2-only embedded rows (content blocks, shortcodes) are excluded.
 *
 * @param {Object|undefined|null} row
 * @return {boolean} True when the row is persisted in modula-images.
 */
function isModulaImagesStoreRow(row) {
	if (!row) {
		return false;
	}
	return !isEmbeddedGalleryItemRow(row);
}

/**
 * Map store index → 0-based row index in post meta `modula-images`.
 * Skips v2 embedded rows that are not persisted in modula-images.
 *
 * @param {Array<Object>} items
 * @param {number}        storeIndex
 * @return {number} 0-based modula-images row index, or -1.
 */
export function storeIndexToModulaImagesRowIndex(items, storeIndex) {
	if (!Array.isArray(items) || storeIndex < 0 || storeIndex >= items.length) {
		return -1;
	}
	if (!isModulaImagesStoreRow(items[storeIndex])) {
		return -1;
	}
	let n = 0;
	for (let i = 0; i < storeIndex; i++) {
		if (isModulaImagesStoreRow(items[i])) {
			n++;
		}
	}
	return n;
}

/**
 * Normalize id strings for Redux ↔ tile lookup (embedded UUIDs are case-insensitive).
 *
 * @param {unknown} raw
 * @return {string} Normalized lookup string.
 */
export function normalizeGalleryItemLookupString(raw) {
	if (raw === undefined || raw === null) {
		return '';
	}
	const s = String(raw).trim();
	if (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			s
		)
	) {
		return s.toLowerCase();
	}
	return s;
}

/**
 * Id used to match a rendered tile to `items.items` (embedded rows: prefer embeddedId).
 *
 * @param {Object|null|undefined} itemData Row passed to GalleryItem / toolbar.
 * @return {string|number|undefined} Lookup key, or undefined.
 */
export function previewItemRowLookupKey(itemData) {
	if (!itemData || typeof itemData !== 'object') {
		return undefined;
	}
	if (
		itemData.itemKind === 'content_block' ||
		itemData.itemKind === 'shortcode'
	) {
		const k = itemData.embeddedId ?? itemData.id;
		if (k !== undefined && k !== null && String(k).trim() !== '') {
			const n = normalizeGalleryItemLookupString(k);
			return n === '' ? String(k).trim() : n;
		}
	}
	// Embedded rows should always carry itemKind, but partial hydration / filters can omit it;
	// embeddedId still uniquely identifies v2-only rows in the store.
	if (
		itemData.embeddedId !== undefined &&
		itemData.embeddedId !== null &&
		String(itemData.embeddedId).trim() !== ''
	) {
		const n = normalizeGalleryItemLookupString(itemData.embeddedId);
		return n === '' ? String(itemData.embeddedId).trim() : n;
	}
	const id = itemData.id;
	return id !== undefined && id !== null && String(id).trim() !== ''
		? id
		: undefined;
}

/**
 * Find first store index for a gallery item id.
 * Matches `id` or `embeddedId` so v2 embedded rows stay addressable after REST/bootstrap hydration.
 *
 * @param {Array<Object>}                items  List from Redux `items.items`.
 * @param {string|number|undefined|null} itemId Attachment id, embedded UUID, or undefined.
 * @return {number} Store index, or -1.
 */
export function findStoreIndexForItemId(items, itemId) {
	if (!Array.isArray(items)) {
		return -1;
	}
	if (
		itemId === undefined ||
		itemId === null ||
		String(itemId).trim() === ''
	) {
		return -1;
	}
	const sid = normalizeGalleryItemLookupString(itemId);
	return items.findIndex((it) => {
		if (!it) {
			return false;
		}
		if (normalizeGalleryItemLookupString(it.id) === sid) {
			return true;
		}
		if (
			it.embeddedId !== undefined &&
			it.embeddedId !== null &&
			normalizeGalleryItemLookupString(it.embeddedId) === sid
		) {
			return true;
		}
		return false;
	});
}

/**
 * Stable React list key for gallery items (numeric attachment id or embedded UUID).
 *
 * @param {Object} item  Raw row from bootstrap / Redux.
 * @param {number} index Fallback index.
 * @return {string} Stable list key.
 */
export function galleryItemRowKey(item, index = 0) {
	if (item?.itemKind === 'content_block' || item?.itemKind === 'shortcode') {
		const e = item.embeddedId ?? item.id;
		if (e !== undefined && e !== null && String(e).trim() !== '') {
			const n = normalizeGalleryItemLookupString(e);
			return n === '' ? String(e).trim() : n;
		}
	}
	const id = item?.id;
	if (id !== undefined && id !== null && String(id).trim() !== '') {
		const n = normalizeGalleryItemLookupString(id);
		return n === '' ? String(id).trim() : n;
	}
	return `modula-row-${index}`;
}

/**
 * 0-based row index in post meta `modula-images` for REST replace/remove/patch.
 * When bootstrap applies shuffle (or other reorder), display order ≠ modula-images order;
 * items may carry `modulaRowIndex` from the settings-editor payload.
 *
 * **Duplicate attachment IDs:** if the same image appears twice, `modulaRowIndex` is resolved
 * server-side to a single canonical row (last occurrence wins). Patching by index may then
 * target the wrong duplicate; avoid duplicate IDs in one gallery when using focal/metadata tools.
 *
 * @param {Array<Object>} items
 * @param {number}        storeIndex Index in Redux `items.items`.
 * @return {number} Row index for modula-images, or -1.
 */
export function modulaImagesRowIndex(items, storeIndex) {
	if (!Array.isArray(items) || storeIndex < 0 || storeIndex >= items.length) {
		return -1;
	}
	const row = items[storeIndex];
	const stable =
		row &&
		typeof row.modulaRowIndex === 'number' &&
		row.modulaRowIndex >= 0;
	if (stable) {
		return row.modulaRowIndex;
	}
	return storeIndexToModulaImagesRowIndex(items, storeIndex);
}

/**
 * modula-images write index for the settings-editor live preview.
 * Uses the current display order only — never {@link row.modulaRowIndex}, which is a
 * bootstrap snapshot and goes stale after reorder/sort (wrong row → duplicate tiles).
 *
 * @param {Array<Object>} items
 * @param {number}        storeIndex Index in Redux `items.items`.
 * @return {number} Row index for modula-images REST writes, or -1.
 */
export function modulaImagesRowIndexForPreviewWrite(items, storeIndex) {
	return storeIndexToModulaImagesRowIndex(items, storeIndex);
}
