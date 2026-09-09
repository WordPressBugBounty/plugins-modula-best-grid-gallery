/**
 * Creative gallery: tile aspect ratio for image-focus crop framing.
 *
 * Tiles are packery-generated (not stored on the item row). Prefer reading the
 * rendered preview shell; fall back to the same deterministic layout math as
 * `CreativeGalleryLayout`.
 *
 * @package
 */

import { isCaptionBelowImage } from './captionPlacement';
import { galleryItemRowKey } from './galleryItemIdentity';
import { previewCatalogPagesFromGalleryState } from './previewCatalogPages';
import { generatePackeryTiles, hashLayoutSeedString } from './packeryLayout';
import { resolveResponsiveGalleryHeight } from './resolvePreviewViewport';

/**
 * @param {number} w Tile width in px
 * @param {number} h Tile height in px
 * @return {{ ratio: number, label: string, tileW: number, tileH: number }|null}
 */
function formatTileAspect(w, h) {
	if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
		return null;
	}
	const rw = Math.round(w);
	const rh = Math.round(h);
	const g = gcd(rw, rh);
	return {
		ratio: w / h,
		label: `${Math.round(rw / g)}:${Math.round(rh / g)}`,
		tileW: w,
		tileH: h,
	};
}

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function gcd(a, b) {
	let x = Math.abs(a);
	let y = Math.abs(b);
	while (y > 0) {
		const t = y;
		y = x % y;
		x = t;
	}
	return x || 1;
}

/**
 * Read tile aspect from the live preview DOM (matches painted layout).
 *
 * @param {string|number|null|undefined} imageId Attachment / modula image id
 * @return {{ ratio: number, label: string, tileW: number, tileH: number }|null}
 */
export function readCreativeGalleryTileAspectFromDom(imageId) {
	if (imageId === null || imageId === undefined || imageId === '') {
		return null;
	}
	if (typeof document === 'undefined') {
		return null;
	}
	const inner = document.querySelector(
		`.modula-creative-gallery [data-modula-image-id="${CSS.escape(
			String(imageId)
		)}"]`
	);
	const shell = inner?.closest('.modula-item-tiled');
	if (!shell) {
		return null;
	}
	const attrW = parseFloat(shell.getAttribute('data-tile-width') || '');
	const attrH = parseFloat(shell.getAttribute('data-tile-height') || '');
	const w = Number.isFinite(attrW) && attrW > 0 ? attrW : shell.offsetWidth;
	const h = Number.isFinite(attrH) && attrH > 0 ? attrH : shell.offsetHeight;
	return formatTileAspect(w, h);
}

/**
 * Locate the packery tile for an item using the same seed as `CreativeGalleryLayout`.
 *
 * @param {Object}                      params
 * @param {Object}                      params.item
 * @param {Array<Object>}               params.items            Preview catalog (gallery items)
 * @param {Object}                      params.config           Gallery config
 * @param {number}                      params.galleryId
 * @param {number|null|undefined}       [params.containerWidth]
 * @param {Object}                      [params.settings]       Grouped v2 settings.
 * @param {{ displayContext?: string }} [params.metadata]       Display context metadata.
 * @return {{ ratio: number, label: string, tileW: number, tileH: number }|null} Tile aspect, or null when unknown.
 */
export function resolveCreativeGalleryTileAspect({
	item,
	items,
	config,
	galleryId,
	containerWidth,
	settings,
	metadata,
}) {
	if (!item || !Array.isArray(items) || !config) {
		return null;
	}

	let width = Number(containerWidth);
	if (!Number.isFinite(width) || width <= 0) {
		if (typeof document !== 'undefined') {
			const root = document.querySelector('.modula-creative-gallery');
			width = root?.offsetWidth ?? 0;
		}
	}
	if (!Number.isFinite(width) || width <= 0) {
		return null;
	}

	const chunks = previewCatalogPagesFromGalleryState(items, {
		settings,
		metadata,
		config,
	});
	let sectionIndex = -1;
	let tileIndex = -1;
	const targetId =
		item?.id !== undefined && item?.id !== null ? String(item.id) : '';

	for (let si = 0; si < chunks.length; si++) {
		const chunk = chunks[si];
		const idx = targetId
			? chunk.findIndex((row) => String(row?.id) === targetId)
			: chunk.findIndex(
					(row, rowIndex) =>
						galleryItemRowKey(row, rowIndex) ===
						galleryItemRowKey(item, rowIndex)
				);
		if (idx >= 0) {
			sectionIndex = si;
			tileIndex = idx;
			break;
		}
	}

	if (sectionIndex < 0 || tileIndex < 0) {
		return null;
	}

	const chunk = chunks[sectionIndex];
	const count = chunk.length;
	if (count <= 0) {
		return null;
	}

	const gutter = parseInt(config?.gutter ?? 0, 10);
	const randomFactor = Number(config?.randomFactor ?? 0);
	const height = resolveResponsiveGalleryHeight(config);
	const captionBelowImage = isCaptionBelowImage(config);
	const idKey = chunk
		.map((row, idx) => galleryItemRowKey(row, idx))
		.join(':');
	const layoutSeed = hashLayoutSeedString(
		`${galleryId}|${sectionIndex}|${idKey}|${randomFactor}|${gutter}|${Math.round(
			Number(height) || 0
		)}|${captionBelowImage ? 'below-image' : 'inside-image'}`
	);
	const tiles = generatePackeryTiles(width, height, count, {
		gutter,
		randomFactor,
		layoutSeed,
	});
	const tile = tiles[tileIndex];
	if (!tile) {
		return null;
	}
	return formatTileAspect(tile.width, tile.height);
}

/**
 * @param {Object}                      params
 * @param {Object}                      params.item
 * @param {Array<Object>}               params.items
 * @param {Object}                      params.config
 * @param {number}                      params.galleryId
 * @param {number|null|undefined}       [params.containerWidth]
 * @param {Object}                      [params.settings]       Grouped v2 settings.
 * @param {{ displayContext?: string }} [params.metadata]       Display context metadata.
 * @return {{ ratio: number, label: string, tileW: number, tileH: number }|null} Tile aspect, or null when unknown.
 */
export function getCreativeGalleryItemFocusAspect({
	item,
	items,
	config,
	galleryId,
	containerWidth,
	settings,
	metadata,
}) {
	return (
		readCreativeGalleryTileAspectFromDom(item?.id) ??
		resolveCreativeGalleryTileAspect({
			item,
			items,
			config,
			galleryId,
			containerWidth,
			settings,
			metadata,
		})
	);
}
