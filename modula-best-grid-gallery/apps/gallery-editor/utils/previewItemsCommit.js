/**
 * Keep Redux items + originalItems in sync after editor-preview mutations.
 *
 * @package
 */
import {
	asGalleryItemList,
	commitPreviewCatalog,
	isEmbeddedGalleryItemRow,
	isTemplateOwnedEmbeddedId,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { captionToPlainString } from './captionToPlainString';
import {
	applyVideoTemplateDisplayFieldsToPreviewItem,
	isVideoTemplateRow,
} from './videoTemplateItems';
import { patchBootstrapQueryItems } from './patchBootstrapQueryItems';

export { commitPreviewCatalog };

/**
 * Drop stale `modulaRowIndex` from preview rows (see useGalleryReorderController).
 *
 * @param {Object[]} rows
 * @return {Object[]}
 */
export function stripStaleModulaRowIndex(rows) {
	if (!Array.isArray(rows)) {
		return rows;
	}
	return rows.map((row) => {
		if (
			!row ||
			typeof row !== 'object' ||
			!Object.prototype.hasOwnProperty.call(row, 'modulaRowIndex')
		) {
			return row;
		}
		const next = { ...row };
		delete next.modulaRowIndex;
		return next;
	});
}

/**
 * Apply core rows to Redux and patch the React Query bootstrap cache in one sync step
 * so hydration never merges stale bootstrap rows (replace / reorder races).
 *
 * @param {import('@reduxjs/toolkit').Store}                           store
 * @param {import('@tanstack/react-query').QueryClient|null|undefined} queryClient
 * @param {number}                                                     galleryId
 * @param {Object[]}                                                   coreItems
 */
export function syncPreviewCoreToStoreAndBootstrap(
	store,
	queryClient,
	galleryId,
	coreItems
) {
	const core = stripStaleModulaRowIndex(
		Array.isArray(coreItems) ? coreItems : []
	);
	commitPreviewCatalog(store, core);
	if (queryClient && galleryId) {
		patchBootstrapQueryItems(queryClient, galleryId, core);
	}
}

/**
 * @param {Object} row
 * @return {string}
 */
function embeddedBootstrapRowKey(row) {
	if (!row || typeof row !== 'object' || !isEmbeddedGalleryItemRow(row)) {
		return '';
	}
	const key = row.embeddedId ?? row.id;
	return key !== undefined && key !== null ? String(key) : '';
}

/**
 * Stable merge key for modula-images rows (numeric attachments + video templates).
 *
 * @param {Object} row
 * @return {string}
 */
function modulaImagesBootstrapRowKey(row) {
	if (!row || typeof row !== 'object' || isEmbeddedGalleryItemRow(row)) {
		return '';
	}
	if (isVideoTemplateRow(row)) {
		const id = row.id ?? '';
		return id !== undefined && id !== null && String(id).trim() !== ''
			? `video:${String(id)}`
			: '';
	}
	const id = Number(row.id);
	if (Number.isFinite(id) && id > 0) {
		return `att:${id}`;
	}
	return '';
}

/**
 * Same-length bootstrap refresh: cache already matches display order (replace, reorder, sort).
 * Prefer incoming rows positionally; keep a current embedded row only when bootstrap omitted it.
 *
 * @param {Object[]} currentItems
 * @param {Object[]} incomingItems
 * @return {Object[]}
 */
function mergeBootstrapItemsSameLengthByPosition(currentItems, incomingItems) {
	return incomingItems.map((incomingRow, index) => {
		const currentRow = currentItems[index];
		if (!incomingRow || typeof incomingRow !== 'object') {
			return currentRow;
		}
		if (!currentRow || typeof currentRow !== 'object') {
			return incomingRow;
		}
		if (
			isEmbeddedGalleryItemRow(currentRow) &&
			!isEmbeddedGalleryItemRow(incomingRow)
		) {
			return currentRow;
		}
		return incomingRow;
	});
}

/**
 * When bootstrap refetch omits embedded tiles, keep store rows in display order.
 *
 * @param {Object[]} currentItems  Rows currently in the preview Redux store.
 * @param {Object[]} incomingItems Rows from the latest bootstrap payload.
 * @return {Object[]}
 */
export function mergeBootstrapItemsPreservingEmbedded(
	currentItems,
	incomingItems
) {
	const current = Array.isArray(currentItems) ? currentItems : [];
	const incoming = Array.isArray(incomingItems) ? [...incomingItems] : [];
	if (!current.length) {
		return incoming;
	}
	if (!incoming.length) {
		return current;
	}
	if (current.length === incoming.length) {
		return stripStaleModulaRowIndex(
			mergeBootstrapItemsSameLengthByPosition(current, incoming)
		);
	}

	/** @type {Map<string, Object>} */
	const incomingEmbedded = new Map();
	/** @type {Map<string, Object[]>} */
	const incomingImageQueues = new Map();
	/** @type {Set<string>} */
	const usedEmbedded = new Set();

	for (const row of incoming) {
		if (!row || typeof row !== 'object') {
			continue;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			const key = embeddedBootstrapRowKey(row);
			if (key) {
				incomingEmbedded.set(key, row);
			}
			continue;
		}
		const key = modulaImagesBootstrapRowKey(row);
		if (key) {
			if (!incomingImageQueues.has(key)) {
				incomingImageQueues.set(key, []);
			}
			incomingImageQueues.get(key).push(row);
		}
	}

	/** @type {Map<string, number>} */
	const currentImageKeyCounts = new Map();
	for (const row of current) {
		const key = modulaImagesBootstrapRowKey(row);
		if (key) {
			currentImageKeyCounts.set(
				key,
				(currentImageKeyCounts.get(key) || 0) + 1
			);
		}
	}

	/** @type {Map<string, number>} */
	const matchedImageKeyCounts = new Map();

	/** @type {Object[]} */
	const merged = [];

	for (const row of current) {
		if (!row || typeof row !== 'object') {
			continue;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			const key = embeddedBootstrapRowKey(row);
			if (key && incomingEmbedded.has(key)) {
				merged.push(incomingEmbedded.get(key));
				usedEmbedded.add(key);
			} else if (key && !isTemplateOwnedEmbeddedId(key)) {
				/* Keep user-added embeds omitted from a stale bootstrap snapshot. */
				merged.push(row);
			}
			/* Drop template-owned embeds from another layout when bootstrap replaced them. */
			continue;
		}
		const key = modulaImagesBootstrapRowKey(row);
		if (!key) {
			continue;
		}
		const queue = incomingImageQueues.get(key);
		if (queue && queue.length > 0) {
			merged.push(queue.shift());
			matchedImageKeyCounts.set(
				key,
				(matchedImageKeyCounts.get(key) || 0) + 1
			);
			continue;
		}
		merged.push(row);
	}

	for (const row of incoming) {
		if (!row || typeof row !== 'object') {
			continue;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			const key = embeddedBootstrapRowKey(row);
			if (key && !usedEmbedded.has(key)) {
				merged.push(row);
				usedEmbedded.add(key);
			}
		}
	}

	for (const [key, queue] of incomingImageQueues) {
		const currentCount = currentImageKeyCounts.get(key) || 0;
		const matchedCount = matchedImageKeyCounts.get(key) || 0;
		let extraNeeded = Math.max(0, currentCount - matchedCount);
		while (queue.length > 0) {
			if (extraNeeded > 0) {
				merged.push(queue.shift());
				extraNeeded -= 1;
				continue;
			}
			// Brand-new attachment ids only (not stale replaced ids).
			if (currentCount === 0) {
				merged.push(queue.shift());
				continue;
			}
			queue.shift();
		}
	}

	return stripStaleModulaRowIndex(merged.length ? merged : incoming);
}

/**
 * Reorder core preview rows to match attachment ID order (mirrors PHP `build_reordered_rows_from_order`).
 * Rows without a matching ID (embedded blocks, etc.) stay at the end in their relative order.
 *
 * @param {Object[]} coreItems Preview catalog (gallery items).
 * @param {number[]} orderedIds Attachment IDs in the target order.
 * @return {Object[]}
 */
export function reorderCoreItemsByAttachmentIds(coreItems, orderedIds) {
	if (!Array.isArray(coreItems) || !coreItems.length) {
		return Array.isArray(coreItems) ? coreItems : [];
	}
	if (!Array.isArray(orderedIds) || !orderedIds.length) {
		return [...coreItems];
	}
	/** @type {Object[]} */
	const remaining = [...coreItems];
	/** @type {Object[]} */
	const picked = [];

	for (const rawId of orderedIds) {
		const wantId = Number(rawId);
		if (!Number.isFinite(wantId) || wantId <= 0) {
			continue;
		}
		const idx = remaining.findIndex((row) => {
			if (
				!row ||
				typeof row !== 'object' ||
				isEmbeddedGalleryItemRow(row)
			) {
				return false;
			}
			return Number(row.id) === wantId;
		});
		if (idx < 0) {
			continue;
		}
		picked.push(remaining[idx]);
		remaining.splice(idx, 1);
	}

	return [...picked, ...remaining];
}

/**
 * Reorder core preview rows using reorder-panel sort keys and a key → row map.
 *
 * @param {Object[]}                         coreItems
 * @param {string[]}                         orderKeys
 * @param {Map<string, { rawRow?: Object }>} keyToRow
 * @return {Object[]}
 */
export function reorderCoreItemsBySortKeys(coreItems, orderKeys, keyToRow) {
	if (!Array.isArray(coreItems) || !orderKeys?.length || !keyToRow?.size) {
		return Array.isArray(coreItems) ? [...coreItems] : [];
	}

	/** @type {Object[]} */
	const picked = [];
	const used = new Set();

	for (const key of orderKeys) {
		const entry = keyToRow.get(key);
		const raw = entry?.rawRow;
		if (!raw || typeof raw !== 'object') {
			continue;
		}
		const rawEmbedded = raw.embeddedId ?? raw.id;
		const rawId = Number(raw.id);
		const idx = coreItems.findIndex((row, i) => {
			if (!row || used.has(i)) {
				return false;
			}
			if (isEmbeddedGalleryItemRow(raw)) {
				const rowEmbedded = row.embeddedId ?? row.id;
				return (
					String(rowEmbedded) === String(rawEmbedded) &&
					isEmbeddedGalleryItemRow(row)
				);
			}
			return Number(row.id) === rawId && !isEmbeddedGalleryItemRow(row);
		});
		if (idx >= 0) {
			picked.push(coreItems[idx]);
			used.add(idx);
		}
	}

	for (let i = 0; i < coreItems.length; i++) {
		if (!used.has(i)) {
			picked.push(coreItems[i]);
		}
	}

	return picked;
}

/**
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {number}                           storeIndex Index in state.items.items.
 */
export function removePreviewItemAtStoreIndex(store, storeIndex) {
	const state = store.getState();
	const items = state.items.items;
	if (storeIndex < 0 || storeIndex >= items.length) {
		return;
	}
	const coreIndex = storeIndexToCoreIndex(items, storeIndex);
	if (coreIndex < 0) {
		return;
	}
	const core = asGalleryItemList(items);
	core.splice(coreIndex, 1);
	commitPreviewCatalog(store, core);
}

/**
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {number}                           storeIndex
 * @param {Object}                           nextItem   Full item row for preview (already merged).
 */
export function replacePreviewItemAtStoreIndex(store, storeIndex, nextItem) {
	const state = store.getState();
	const items = state.items.items;
	const coreIndex = storeIndexToCoreIndex(items, storeIndex);
	if (coreIndex < 0) {
		return;
	}
	const core = asGalleryItemList(items);
	core[coreIndex] = nextItem;
	commitPreviewCatalog(store, core);
}

/**
 * REST may return `id: ""` when PHP sanitize filled the whitelist from a row without `id`.
 * `row.id ?? prev` would keep `""` (only null/undefined trigger ??), and prepareItemData drops the item.
 *
 * @param {unknown} rowId
 * @param {unknown} fallbackId
 * @return {unknown} Sanitized id for the merged row.
 */
function mergeRowId(rowId, fallbackId) {
	if (rowId === '' || rowId === null || rowId === undefined) {
		return fallbackId;
	}
	return rowId;
}

/**
 * Prefer REST row value when the key is present (including `''`). `??` alone keeps old
 * focal when the server sends cleared fields as empty strings.
 *
 * @param {Object} row
 * @param {Object} prevItem
 * @param {string} key
 * @return {*} Value from row when key is present, otherwise from prevItem.
 */
function mergeRowFieldIfPresent(row, prevItem, key) {
	return Object.prototype.hasOwnProperty.call(row, key)
		? row[key]
		: prevItem[key];
}

/** data-* keys that duplicate focal_* on the img; must stay in sync after PATCH clears focus. */
const FOCAL_IMG_DATA_ATTR_KEYS = [
	'data-focal-x',
	'data-focal-y',
	'data-focal-crop-x',
	'data-focal-crop-y',
	'data-focal-crop-w',
	'data-focal-crop-h',
	'data-tile-image-fit',
];

/**
 * Drop focal-related img data attributes so `parseItemFocalPoint` / `parseItemFocalCrop`
 * do not read stale values after the row fields were cleared (merge does not rebuild attrs).
 *
 * @param {Object} item Preview Redux row
 * @return {Object} Same item or a shallow copy without focal data-* img attrs.
 */
export function stripFocalDataAttributesFromPreviewItem(item) {
	if (!item || typeof item !== 'object') {
		return item;
	}
	const stripAttrs = (attrs) => {
		if (!attrs || typeof attrs !== 'object') {
			return attrs;
		}
		let next = attrs;
		let copied = false;
		for (const k of FOCAL_IMG_DATA_ATTR_KEYS) {
			if (Object.prototype.hasOwnProperty.call(next, k)) {
				if (!copied) {
					next = { ...attrs };
					copied = true;
				}
				delete next[k];
			}
		}
		return next;
	};
	const imgAttributes = stripAttrs(item.imgAttributes);
	const legacyImgAttrs = stripAttrs(item.img_attributes);
	if (
		imgAttributes === item.imgAttributes &&
		legacyImgAttrs === item.img_attributes
	) {
		return item;
	}
	const out = {
		...item,
		...(item.imgAttributes !== undefined ? { imgAttributes } : {}),
	};
	if (item.img_attributes !== undefined) {
		out.img_attributes = legacyImgAttrs;
	}
	return out;
}

/** Bootstrap processor fields that still reference the previous attachment bitmap. */
const STALE_ATTACHMENT_MEDIA_ROW_KEYS = [
	'srcset',
	'sizes',
	'pictureSources',
	'image_full',
	'imageFull',
];

/** img data-* / attrs that pin the old attachment URL in `<picture>` / lightbox. */
const STALE_ATTACHMENT_IMG_ATTR_KEYS = ['data-full', 'src', 'srcset'];

/**
 * After replace-by-index the REST row only carries modula-images fields; spreading
 * `prevItem` keeps bootstrap `srcset` / `pictureSources` / `data-full` from the
 * old attachment. Browsers prefer `<source srcset>` over `<img src>`, so the tile
 * keeps showing the previous image until bootstrap is fully reprocessed.
 *
 * @param {Object} item Merged preview row (mutated copy returned).
 * @return {Object}
 */
function stripStaleBootstrapMediaFieldsAfterAttachmentReplace(item) {
	if (!item || typeof item !== 'object') {
		return item;
	}
	const next = { ...item };
	for (const key of STALE_ATTACHMENT_MEDIA_ROW_KEYS) {
		delete next[key];
	}
	delete next.modulaRowIndex;

	const url = next.url || next.src || next.thumbnail || '';
	if (url) {
		next.url = url;
		next.src = url;
		next.thumbnail = url;
	}

	const id = next.id;
	if (id !== undefined && id !== null && String(id).trim() !== '') {
		if (Array.isArray(next.imgClasses)) {
			next.imgClasses = next.imgClasses.map((cls) =>
				/^wp-image-\d+$/.test(String(cls)) ? `wp-image-${id}` : cls
			);
		} else {
			next.imgClasses = ['pic', `wp-image-${id}`];
		}
		const imageId = Number(id);
		if (Number.isFinite(imageId) && imageId > 0) {
			next.linkAttributes = {
				...(next.linkAttributes || {}),
				'data-image-id': String(imageId),
			};
		}
	}

	const stripImgAttrs = (attrs) => {
		if (!attrs || typeof attrs !== 'object') {
			return attrs;
		}
		let copy = attrs;
		let copied = false;
		for (const key of STALE_ATTACHMENT_IMG_ATTR_KEYS) {
			if (Object.prototype.hasOwnProperty.call(copy, key)) {
				if (!copied) {
					copy = { ...attrs };
					copied = true;
				}
				delete copy[key];
			}
		}
		return copy;
	};

	if (next.imgAttributes !== undefined) {
		next.imgAttributes = stripImgAttrs(next.imgAttributes);
	}
	if (next.img_attributes !== undefined) {
		next.img_attributes = stripImgAttrs(next.img_attributes);
	}

	return stripFocalDataAttributesFromPreviewItem(next);
}

/**
 * Merge server modula-images row fields into an existing preview item.
 *
 * @param {Object} prevItem Existing bootstrap-shaped item in preview state.
 * @param {Object} row      Sanitized row from REST / modula-images.
 * @return {Object} Merged item for Redux `items`.
 */
export function mergeModulaRowIntoPreviewItem(prevItem, row) {
	if (!row || !prevItem) {
		return prevItem;
	}
	const nextId = mergeRowId(row.id, prevItem.id);
	const attachmentReplaced =
		prevItem.id !== undefined &&
		prevItem.id !== null &&
		String(prevItem.id).trim() !== '' &&
		String(nextId) !== String(prevItem.id);
	const url = attachmentReplaced
		? String(row.src || row.thumbnail || '').trim()
		: prevItem.src || prevItem.thumbnail || prevItem.url || '';
	const videoThumbnail = mergeRowFieldIfPresent(
		row,
		prevItem,
		'video_thumbnail'
	);
	const videoUrl = mergeRowFieldIfPresent(row, prevItem, 'video_url');
	const merged = {
		...prevItem,
		id: nextId,
		title:
			captionToPlainString(row.title) ||
			captionToPlainString(prevItem.title),
		description: row.description ?? prevItem.description,
		caption: row.description ?? prevItem.caption,
		alt: row.alt ?? prevItem.alt,
		url,
		src: url || prevItem.src,
		thumbnail: url || prevItem.thumbnail,
		link: row.link ?? prevItem.link,
		target: row.target ?? prevItem.target,
		halign: row.halign ?? prevItem.halign,
		valign: row.valign ?? prevItem.valign,
		togglelightbox: row.togglelightbox ?? prevItem.togglelightbox,
		hide_title: row.hide_title ?? prevItem.hide_title,
		filters: row.filters ?? prevItem.filters,
		video_template: row.video_template ?? prevItem.video_template,
		video_url: videoUrl,
		video_thumbnail: videoThumbnail,
		autoplay_thumbnail:
			row.autoplay_thumbnail ?? prevItem.autoplay_thumbnail,
		autoplay_lightbox: row.autoplay_lightbox ?? prevItem.autoplay_lightbox,
		loop_video: row.loop_video ?? prevItem.loop_video,
		exif_camera: row.exif_camera ?? prevItem.exif_camera,
		exif_lens: row.exif_lens ?? prevItem.exif_lens,
		exif_focal_length: row.exif_focal_length ?? prevItem.exif_focal_length,
		exif_shutter_speed:
			row.exif_shutter_speed ?? prevItem.exif_shutter_speed,
		exif_aperture: row.exif_aperture ?? prevItem.exif_aperture,
		exif_iso: row.exif_iso ?? prevItem.exif_iso,
		exif_date: row.exif_date ?? prevItem.exif_date,
		focal_x: mergeRowFieldIfPresent(row, prevItem, 'focal_x'),
		focal_y: mergeRowFieldIfPresent(row, prevItem, 'focal_y'),
		focal_crop_x: mergeRowFieldIfPresent(row, prevItem, 'focal_crop_x'),
		focal_crop_y: mergeRowFieldIfPresent(row, prevItem, 'focal_crop_y'),
		focal_crop_w: mergeRowFieldIfPresent(row, prevItem, 'focal_crop_w'),
		focal_crop_h: mergeRowFieldIfPresent(row, prevItem, 'focal_crop_h'),
		tile_image_fit: mergeRowFieldIfPresent(row, prevItem, 'tile_image_fit'),
		width: mergeRowFieldIfPresent(row, prevItem, 'width'),
		height: mergeRowFieldIfPresent(row, prevItem, 'height'),
		gridX: mergeRowFieldIfPresent(row, prevItem, 'gridX'),
		gridY: mergeRowFieldIfPresent(row, prevItem, 'gridY'),
		gridLocked: mergeRowFieldIfPresent(row, prevItem, 'gridLocked'),
	};

	if (
		String(videoUrl ?? '').trim() ||
		isVideoTemplateRow(merged) ||
		isVideoTemplateRow(prevItem)
	) {
		const videoMerged = applyVideoTemplateDisplayFieldsToPreviewItem(
			merged,
			{
				video_url: videoUrl,
				video_thumbnail: videoThumbnail,
			}
		);
		if (attachmentReplaced) {
			return stripStaleBootstrapMediaFieldsAfterAttachmentReplace(
				videoMerged
			);
		}
		return videoMerged;
	}

	const imageMerged = {
		...merged,
		src: url || prevItem.src,
		thumbnail: url || prevItem.thumbnail,
	};
	if (attachmentReplaced) {
		return stripStaleBootstrapMediaFieldsAfterAttachmentReplace(
			imageMerged
		);
	}
	return imageMerged;
}
