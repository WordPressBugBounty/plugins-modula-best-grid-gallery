/**
 * Resolve the item list used for Fancybox when “Show all images in lightbox” is on.
 * Never mutates gallery display items — fetch/cache is lightbox-only.
 *
 * @package
 */
import { isLightboxToggleOn } from '../utils/lightboxSettingsToFancyboxOpts';

/** @type {Map<string, unknown[]>} */
const catalogCache = new Map();

/** @type {Map<string, Promise<unknown[]>>} */
const catalogInflight = new Map();

/**
 * @param {object|null|undefined} settings Grouped gallery settings.
 * @returns {boolean}
 */
export function isShowAllOnLightbox(settings) {
	return isLightboxToggleOn(settings?.lightbox?.showAll);
}

/**
 * @param {string|number|null|undefined} galleryId
 * @param {unknown[]} [activeFilters]
 * @param {number|null|undefined} shuffleSeed
 * @returns {string}
 */
function buildLightboxCatalogCacheKey(galleryId, activeFilters, shuffleSeed) {
	const id =
		galleryId === null || galleryId === undefined ? '' : String(galleryId);
	const seed =
		typeof shuffleSeed === 'number' && shuffleSeed > 0 ? shuffleSeed : 0;
	return `${id}::${seed}::${JSON.stringify(
		Array.isArray(activeFilters) ? activeFilters : []
	)}`;
}

/**
 * @param {string|number|null|undefined} [galleryId] When set, only clear that gallery’s entries.
 */
export function clearLightboxCatalogCache(galleryId) {
	if (galleryId === null || galleryId === undefined || galleryId === '') {
		catalogCache.clear();
		catalogInflight.clear();
		return;
	}
	const prefix = `${String(galleryId)}::`;
	for (const key of [...catalogCache.keys()]) {
		if (key.startsWith(prefix)) {
			catalogCache.delete(key);
		}
	}
	for (const key of [...catalogInflight.keys()]) {
		if (key.startsWith(prefix)) {
			catalogInflight.delete(key);
		}
	}
}

/**
 * @param {unknown[]} list
 * @returns {unknown[]}
 */
function asItemList(list) {
	return Array.isArray(list) ? list : [];
}

/**
 * @param {{
 *   settings?: object,
 *   displayItems?: unknown[],
 *   items?: unknown[],
 *   originalItems?: unknown[],
 *   filteredItems?: unknown[]|null,
 *   fetchFunction?: ((params: object) => Promise<{ items?: unknown[] }>)|null,
 *   galleryId?: string|number|null,
 *   activeFilters?: unknown[],
 *   totalItems?: number,
 *   shuffleSeed?: number|null,
 * }} args
 * @returns {Promise<unknown[]>}
 */
export async function resolveLightboxItemsForOpen(args = {}) {
	const displayItems = asItemList(args.displayItems);
	const pageItems = asItemList(args.items);
	const originalItems = asItemList(args.originalItems);
	const filteredItems = Array.isArray(args.filteredItems)
		? args.filteredItems
		: null;
	const totalItems = Number(args.totalItems) || 0;
	const fetchFunction = args.fetchFunction;
	const activeFilters = Array.isArray(args.activeFilters)
		? args.activeFilters
		: [];

	if (!isShowAllOnLightbox(args.settings)) {
		return displayItems.length > 0 ? displayItems : pageItems;
	}

	// Client filters keep the full matching list in filteredItems (may be empty).
	if (filteredItems !== null) {
		return filteredItems;
	}

	// Load-more / infinite already accumulated the full catalog in `items`.
	if (totalItems > 0 && pageItems.length >= totalItems) {
		return pageItems;
	}

	const hasFetch = typeof fetchFunction === 'function';
	const hasFullLocalCatalog =
		!hasFetch || totalItems <= 0 || originalItems.length >= totalItems;

	if (hasFullLocalCatalog && originalItems.length > 0) {
		return originalItems;
	}

	if (!hasFetch) {
		return displayItems.length > 0
			? displayItems
			: pageItems.length > 0
				? pageItems
				: originalItems;
	}

	const key = buildLightboxCatalogCacheKey(
		args.galleryId,
		activeFilters,
		args.shuffleSeed
	);
	const cached = catalogCache.get(key);
	if (cached) {
		return cached;
	}

	const pending = catalogInflight.get(key);
	if (pending) {
		return pending;
	}

	const request = (async () => {
		try {
			const response = await fetchFunction({
				all: true,
				filters: activeFilters,
				page: 1,
				perPage: totalItems > 0 ? totalItems : 12,
			});
			const list = asItemList(response?.items);
			catalogCache.set(key, list);
			return list.length > 0
				? list
				: displayItems.length > 0
					? displayItems
					: pageItems;
		} catch {
			return displayItems.length > 0
				? displayItems
				: pageItems.length > 0
					? pageItems
					: originalItems;
		} finally {
			catalogInflight.delete(key);
		}
	})();

	catalogInflight.set(key, request);
	return request;
}
