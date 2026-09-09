/**
 * Parse Modula deeplink hashes and open Fancybox on the modern React gallery.
 *
 * Hash format: #{customLinkName}-{galleryId}-{1-basedIndex}
 *
 * @package
 */

/**
 * @param {string} [slug]
 * @returns {string}
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
 * @returns {ModulaDeeplinkHashParts|null}
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
 * @returns {string}
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
 * @param {object} [settings] Grouped gallery settings.
 * @param {object} [config] Flat gallery config.
 * @returns {{ enabled: boolean, prefix: string }}
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
 * Resolve 0-based slide index from hash imageRef (1-based index, or attachment id fallback).
 *
 * @param {string} imageRef
 * @param {Array<{ opts?: { image_id?: string|number }, image_id?: string|number }>} slides
 * @returns {number} startIndex or -1 when unresolved
 */
export function resolveDeeplinkStartIndex(imageRef, slides) {
	const list = Array.isArray(slides) ? slides : [];
	if (list.length === 0) {
		return -1;
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
 * @param {object} [settings]
 * @param {object} [config]
 * @param {string} [hash]
 * @returns {ModulaDeeplinkHashParts|null}
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
 * @returns {string}
 */
export function getDeeplinkGalleryIdFromHash(hash) {
	const parsed = parseModulaDeeplinkHash(hash);
	return parsed?.galleryId || '';
}
