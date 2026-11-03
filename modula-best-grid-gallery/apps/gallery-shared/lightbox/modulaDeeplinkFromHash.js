/**
 * Parse Modula deeplink hashes and open Fancybox on the modern React gallery.
 *
 * Hash format: #{customLinkName}-{galleryId}-{1-basedIndex}
 *
 * The index counts the gallery's lightbox images in full gallery order, so a
 * link keeps naming the same image whichever filter the visitor has active.
 *
 * @package
 */
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';
import { isGalleryItemHiddenFromLightbox } from '../utils/prepareItemData';

/**
 * @param {string} [slug]
 * @return {string}
 */
export function normalizeDeeplinkPrefix(slug) {
	if (!slug) {
		return '';
	}
	return String(slug).replace(/^!/, '').trim();
}

/**
 * @typedef {{ prefix: string, galleryId: string, imageRef: string }} ModulaDeeplinkHashParts
 */

/**
 * @param {string} [hash] location.hash or raw hash without leading #.
 * @return {ModulaDeeplinkHashParts|null}
 */
export function parseModulaDeeplinkHash(hash) {
	const raw = String(hash || '')
		.replace(/^#/, '')
		.trim();
	if (!raw) {
		return null;
	}
	const parts = raw.split('-');
	if (parts.length < 3) {
		return null;
	}
	const imageRef = parts.slice(-1)[0];
	const galleryId = parts.slice(-2, -1)[0];
	const prefix = parts.slice(0, -2).join('-');
	if (!imageRef || !galleryId) {
		return null;
	}
	return {
		prefix: normalizeDeeplinkPrefix(prefix),
		galleryId: String(galleryId),
		imageRef: String(imageRef),
	};
}

/**
 * Gallery id from a modern shortcode root (`#modula-123` or `data-gallery-id`).
 *
 * @param {HTMLElement} rootEl
 * @return {string}
 */
export function resolveGalleryIdFromRoot(rootEl) {
	if (!(rootEl instanceof HTMLElement)) {
		return '';
	}
	const dataId = rootEl.getAttribute('data-gallery-id');
	if (dataId) {
		return String(dataId).replace(/^jtg-?/, '');
	}
	const id = rootEl.id || '';
	const match = id.match(/^modula-(.+)$/i);
	if (match) {
		return String(match[1]).replace(/^jtg-?/, '');
	}
	return '';
}

/**
 * @param {Object} [settings] Grouped gallery settings.
 * @param {Object} [config]   Flat gallery config.
 * @return {{ enabled: boolean, prefix: string }}
 */
export function resolveDeeplinkSettings(settings = {}, config = {}) {
	const deeplink = settings?.deeplink || {};
	const enabled =
		deeplink.modulaDeeplink === true ||
		deeplink.modulaDeeplink === 1 ||
		deeplink.modulaDeeplink === '1' ||
		config?.modula_deeplink === 1 ||
		config?.modula_deeplink === '1';

	const rawPrefix =
		(typeof deeplink.customLinkName === 'string' &&
			deeplink.customLinkName.trim()) ||
		(typeof config?.customLinkName === 'string' &&
			config.customLinkName.trim()) ||
		'modulagallery';

	return {
		enabled: Boolean(enabled),
		prefix: normalizeDeeplinkPrefix(rawPrefix) || 'modulagallery',
	};
}

/**
 * Items a deeplink index counts: the rows that open in the Fancybox lightbox,
 * in the order given.
 *
 * @param {unknown[]} items  Gallery rows.
 * @param {Object}    config Flat gallery config (`lightbox` is the default mode).
 * @return {Object[]} Rows in gallery order that open in the lightbox.
 */
export function listDeeplinkItems(items, config) {
	if (!Array.isArray(items)) {
		return [];
	}
	return items.filter((row) => {
		if (!row || isEmbeddedGalleryItemRow(row)) {
			return false;
		}
		if (isGalleryItemHiddenFromLightbox(row)) {
			return false;
		}
		const mode =
			typeof row.lightbox === 'string' && row.lightbox.trim() !== ''
				? row.lightbox
				: config?.lightbox || 'fancybox';
		return mode === 'fancybox';
	});
}

/**
 * Item id a positional imageRef names in the full gallery order.
 *
 * @param {string}    imageRef     1-based index from the hash.
 * @param {unknown[]} catalogItems All gallery rows, unfiltered.
 * @param {Object}    config
 * @return {string} Item id, or '' when imageRef is not a position in the catalog.
 */
export function resolveDeeplinkTargetItemId(imageRef, catalogItems, config) {
	const ordered = listDeeplinkItems(catalogItems, config);
	const position = Number.parseInt(String(imageRef), 10);
	const isPosition =
		Number.isFinite(position) &&
		position >= 1 &&
		position <= ordered.length;
	if (!isPosition) {
		return '';
	}
	const id = ordered[position - 1]?.id;
	return id === undefined || id === null ? '' : String(id);
}

/**
 * Give each slide the deeplink hash of its full-gallery position, so the URL
 * written while the lightbox is open still names that image when a filter is
 * active. Kept off Fancybox's own `slug` key: a per-slide slug makes the Hash
 * plugin push a history entry on open and step back to the link's hash on close.
 *
 * @param {Object[]}  slides
 * @param {unknown[]} catalogItems All gallery rows, unfiltered.
 * @param {Object}    [settings]   Grouped gallery settings.
 * @param {Object}    [config]     Flat gallery config.
 * @return {Object[]} Slides, with `modulaDeeplinkHash` set on those found in the catalog.
 */
export function withDeeplinkHashes(slides, catalogItems, settings, config) {
	const { enabled, prefix } = resolveDeeplinkSettings(settings, config);
	const galleryId = String(config?.galleryId ?? '').replace(/^jtg-?/, '');
	const ordered = listDeeplinkItems(catalogItems, config);
	if (!enabled || !galleryId || ordered.length === 0) {
		return slides;
	}

	const positions = new Map();
	ordered.forEach((row, index) => {
		const id = String(row.id ?? '');
		if (id && !positions.has(id)) {
			positions.set(id, index + 1);
		}
	});
	return slides.map((slide) => {
		const position = positions.get(slide.item_id);
		return position
			? {
					...slide,
					modulaDeeplinkHash: `#${prefix}-${galleryId}-${position}`,
				}
			: slide;
	});
}

/**
 * Resolve 0-based slide index from hash imageRef (1-based index, or attachment id fallback).
 *
 * When `targetItemId` is known (the image the index names in full gallery
 * order), the slide is matched by item id, so a filtered slide list still opens
 * the right image; -1 means that image is not among these slides.
 *
 * @param {string}                                                                                     imageRef
 * @param {Array<{ item_id?: string, opts?: { image_id?: string|number }, image_id?: string|number }>} slides
 * @param {string}                                                                                     [targetItemId]
 * @return {number} startIndex or -1 when unresolved
 */
export function resolveDeeplinkStartIndex(imageRef, slides, targetItemId = '') {
	const list = Array.isArray(slides) ? slides : [];
	if (list.length === 0) {
		return -1;
	}

	if (targetItemId) {
		return list.findIndex(
			(slide) => String(slide?.item_id ?? '') === targetItemId
		);
	}

	const asNumber = Number.parseInt(String(imageRef), 10);
	if (Number.isFinite(asNumber) && asNumber >= 1 && asNumber <= list.length) {
		return asNumber - 1;
	}

	const ref = String(imageRef);
	const byAttachment = list.findIndex((slide) => {
		const id =
			slide?.opts?.image_id ??
			slide?.opts?.imageId ??
			slide?.image_id ??
			slide?.imageId;
		return id !== undefined && id !== null && String(id) === ref;
	});
	return byAttachment;
}

/**
 * Whether the current URL hash targets this gallery root.
 *
 * @param {HTMLElement} rootEl
 * @param {Object}      [settings]
 * @param {Object}      [config]
 * @param {string}      [hash]
 * @return {ModulaDeeplinkHashParts|null}
 */
export function matchDeeplinkHashForGallery(
	rootEl,
	settings = {},
	config = {},
	hash = typeof window !== 'undefined' ? window.location.hash : ''
) {
	const { enabled, prefix } = resolveDeeplinkSettings(settings, config);
	if (!enabled) {
		return null;
	}
	const parsed = parseModulaDeeplinkHash(hash);
	if (!parsed) {
		return null;
	}
	const galleryId = resolveGalleryIdFromRoot(rootEl);
	if (!galleryId || parsed.galleryId !== galleryId) {
		return null;
	}
	if (normalizeDeeplinkPrefix(parsed.prefix) !== prefix) {
		return null;
	}
	return parsed;
}

/**
 * Gallery id from a deeplink hash, if any (for eager loader).
 *
 * @param {string} [hash]
 * @return {string}
 */
export function getDeeplinkGalleryIdFromHash(hash) {
	const parsed = parseModulaDeeplinkHash(hash);
	return parsed?.galleryId || '';
}
