import {
	CONTENT_BLOCK_CREATE_DEFAULT_BACKGROUND,
	CONTENT_BLOCK_CREATE_DEFAULT_HEIGHT,
	CONTENT_BLOCK_CREATE_DEFAULT_WIDTH,
	DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY,
	DEFAULT_BLOCK_BACKGROUND_POSITION,
	DEFAULT_BLOCK_BACKGROUND_REPEAT,
	DEFAULT_BLOCK_BACKGROUND_SIZE,
	DEFAULT_BLOCK_FONT_PRESET,
	DEFAULT_BLOCK_PADDING_PRESET,
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
} from 'gallery-shared/preview';
/**
 * V2-only embedded rows (content block / shortcode) in settings-editor preview + REST save-merged-items.
 *
 * @package
 */


export { isContentBlockGalleryItemRow, isEmbeddedGalleryItemRow };

function newEmbeddedId() {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}
	return `emb-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 11)}`;
}

/**
 * Anchor for Item_Merge: after last image occurrence in display-ordered core list.
 *
 * @param {Object[]} coreItems Striped Redux/core rows (no page breaks).
 * @return {{ afterAttachmentId: number, afterOrdinal: number }} Merge anchor after the last image row.
 */
export function anchorAfterLastImageRow(coreItems) {
	if (!Array.isArray(coreItems) || coreItems.length === 0) {
		return { afterAttachmentId: 0, afterOrdinal: 0 };
	}
	/** @type {Record<number, number>} */
	const counts = {};
	let lastAid = 0;
	let lastOrd = 0;
	for (const row of coreItems) {
		if (isEmbeddedGalleryItemRow(row)) {
			continue;
		}
		const aid = Number(row?.id);
		if (!Number.isFinite(aid) || aid <= 0) {
			continue;
		}
		const occ = counts[aid] ?? 0;
		counts[aid] = occ + 1;
		lastAid = aid;
		lastOrd = occ;
	}
	if (lastAid <= 0) {
		return { afterAttachmentId: 0, afterOrdinal: 0 };
	}
	return { afterAttachmentId: lastAid, afterOrdinal: lastOrd };
}

/**
 * New empty content block (v2 merge contract).
 *
 * @param {Object[]} coreItems
 * @param {{
 *   position?: 'start'|'end',
 *   embeddedId?: string,
 *   title?: string,
 *   description?: string,
 *   blockBodyHtml?: string,
 *   blockFontPreset?: string,
 *   blockPaddingPreset?: string,
 *   blockBackgroundColor?: string,
 *   blockTextColor?: string,
 * }} [opts] `start` → before first image (anchor 0,0); `end` → after last image (default).
 *           Pass `embeddedId` for stable template slot ids.
 * @return {Object} Fresh `content_block` row for the preview/save payload.
 */
export function buildNewContentBlockRow(coreItems, opts = {}) {
	const position = opts.position === 'start' ? 'start' : 'end';
	const embeddedId =
		typeof opts.embeddedId === 'string' && opts.embeddedId.trim() !== ''
			? opts.embeddedId.trim()
			: newEmbeddedId();
	const { afterAttachmentId, afterOrdinal } =
		position === 'start'
			? { afterAttachmentId: 0, afterOrdinal: 0 }
			: anchorAfterLastImageRow(
					Array.isArray(coreItems) ? coreItems : []
				);
	return {
		itemKind: 'content_block',
		embeddedId,
		id: embeddedId,
		afterAttachmentId,
		afterOrdinal,
		title: typeof opts.title === 'string' ? opts.title : '',
		description:
			typeof opts.description === 'string' ? opts.description : '',
		blockBodyHtml:
			typeof opts.blockBodyHtml === 'string'
				? opts.blockBodyHtml
				: '<p></p>',
		blockBackgroundColor:
			typeof opts.blockBackgroundColor === 'string'
				? opts.blockBackgroundColor.trim()
				: CONTENT_BLOCK_CREATE_DEFAULT_BACKGROUND,
		blockTextColor:
			typeof opts.blockTextColor === 'string' ? opts.blockTextColor : '',
		blockPaddingPreset:
			typeof opts.blockPaddingPreset === 'string' &&
			opts.blockPaddingPreset
				? opts.blockPaddingPreset
				: DEFAULT_BLOCK_PADDING_PRESET,
		blockFontPreset:
			typeof opts.blockFontPreset === 'string' && opts.blockFontPreset
				? opts.blockFontPreset
				: DEFAULT_BLOCK_FONT_PRESET,
		blockBackgroundImageId: 0,
		blockBackgroundOverlayOpacity: DEFAULT_BLOCK_BACKGROUND_OVERLAY_OPACITY,
		blockBackgroundSize: DEFAULT_BLOCK_BACKGROUND_SIZE,
		blockBackgroundPosition: DEFAULT_BLOCK_BACKGROUND_POSITION,
		blockBackgroundRepeat: DEFAULT_BLOCK_BACKGROUND_REPEAT,
		width: CONTENT_BLOCK_CREATE_DEFAULT_WIDTH,
		height: CONTENT_BLOCK_CREATE_DEFAULT_HEIGHT,
	};
}

/** Bootstrap-only fields that must not be persisted to modula_images_v2. */
const EMBEDDED_ROW_COMPUTED_SAVE_KEYS = [
	'blockBodyHtmlRendered',
	'shortcodeHtml',
	'blockBackgroundImageUrl',
];

/** Settings-editor bootstrap fields that must not be written back to post meta. */
const BOOTSTRAP_ONLY_ROW_SAVE_KEYS = [
	'modulaRowIndex',
	'itemClasses',
	'itemAttributes',
	'linkClasses',
	'linkAttributes',
	'imgClasses',
	'imgAttributes',
	'srcset',
	'sizes',
	'lazyLoad',
	'hideTitle',
	'hideDescription',
	'hideSocials',
	'src',
	'thumbnail',
];

/**
 * @param {Object} row
 * @return {Object}
 */
function stripBootstrapOnlyRowKeys(row) {
	if (!row || typeof row !== 'object') {
		return row;
	}
	const next = { ...row };
	for (const key of BOOTSTRAP_ONLY_ROW_SAVE_KEYS) {
		delete next[key];
	}
	return next;
}

/**
 * Merge content block editor fields into a v2 embedded row for save-merged-items.
 *
 * @param {Object} row    Existing preview/bootstrap row.
 * @param {Object} fields Partial fields from the content block editor.
 * @return {Object} Row safe to POST (identity + styling + body).
 */
export function mergeContentBlockSaveFieldsIntoRow(row, fields) {
	if (!row || typeof row !== 'object') {
		return fields;
	}
	const base = { ...row };
	for (const key of EMBEDDED_ROW_COMPUTED_SAVE_KEYS) {
		delete base[key];
	}
	const embeddedId = row.embeddedId ?? row.id;
	return {
		...base,
		...fields,
		itemKind: 'content_block',
		embeddedId,
		id: row.id ?? embeddedId,
		afterAttachmentId: Number(row.afterAttachmentId) || 0,
		afterOrdinal: Number(row.afterOrdinal) || 0,
		width: Math.max(1, Number(row.width) || 2),
		height: Math.max(1, Number(row.height) || 2),
	};
}

/**
 * Clone rows for POST body (avoid mutating Redux objects).
 *
 * @param {Object[]} coreItems
 * @return {Object[]} Shallow-cloned rows safe to POST.
 */
export function previewCoreItemsToSaveMergedPayload(coreItems) {
	if (!Array.isArray(coreItems)) {
		return [];
	}
	return coreItems.map((row) => {
		if (!row || typeof row !== 'object') {
			return row;
		}
		const next = stripBootstrapOnlyRowKeys(row);
		for (const key of EMBEDDED_ROW_COMPUTED_SAVE_KEYS) {
			delete next[key];
		}
		return next;
	});
}

/**
 * Refresh afterAttachmentId / afterOrdinal on embedded rows from final interleaved order
 * so a later sync from modula-images + Item_Merge keeps the same visual order.
 *
 * @param {Object[]} items Mixed rows (mutate-safe: returns new array and row objects).
 * @return {Object[]} Same order with updated `afterAttachmentId` / `afterOrdinal` on embedded rows.
 */
export function reanchorEmbeddedRowsInMergedList(items) {
	if (!Array.isArray(items)) {
		return [];
	}
	let lastAid = 0;
	let lastOrd = 0;
	/** @type {Record<number, number>} */
	const counts = {};
	return items.map((row) => {
		if (!row || typeof row !== 'object') {
			return row;
		}
		if (isEmbeddedGalleryItemRow(row)) {
			if (
				Number(row.afterAttachmentId) === lastAid &&
				Number(row.afterOrdinal) === lastOrd
			) {
				return row;
			}
			return {
				...row,
				afterAttachmentId: lastAid,
				afterOrdinal: lastOrd,
			};
		}
		const aid = Number(row.id);
		if (Number.isFinite(aid) && aid > 0) {
			const occ = counts[aid] ?? 0;
			counts[aid] = occ + 1;
			lastAid = aid;
			lastOrd = occ;
		}
		return row;
	});
}
