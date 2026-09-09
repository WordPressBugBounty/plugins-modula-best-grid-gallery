/**
 * Product defaults when grouped/flat settings omit gallery type (CPT + v2 schema).
 *
 * @package
 */

/** @type {'grid'} */
export const DEFAULT_GALLERY_TYPE = 'grid';

/** Default masonry column preset (flat `grid_type` / grouped `layout.gridType`). */
export const DEFAULT_MASONRY_GRID_TYPE = '3';

/**
 * Layouts where the filter bar must not slice items or render visitor chrome.
 *
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITHOUT_FILTERS = new Set([
	'slider',
	'story',
	'showcase',
	'template',
	'parallax-masonry',
	'bnb',
	'video',
]);

/**
 * Layouts where pagination must not slice items or render visitor chrome.
 *
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITHOUT_PAGINATION = new Set([
	'slider',
	'story',
	'showcase',
	'template',
	'parallax-masonry',
	'bnb',
	'video',
]);

/**
 * @deprecated Prefer {@link GALLERY_TYPES_WITHOUT_PAGINATION}.
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITHOUT_FILTER_PAGINATION =
	GALLERY_TYPES_WITHOUT_PAGINATION;

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithoutFilters(type) {
	return GALLERY_TYPES_WITHOUT_FILTERS.has(String(type || '').trim());
}

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithoutPagination(type) {
	return GALLERY_TYPES_WITHOUT_PAGINATION.has(String(type || '').trim());
}

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithoutFilterPagination(type) {
	return isGalleryTypeWithoutPagination(type);
}

/**
 * In-gallery viewers (slider, story, video) — no Fancybox tile links or lightbox settings.
 *
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITHOUT_LIGHTBOX = new Set([
	'slider',
	'story',
	'video',
]);

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithoutLightbox(type) {
	return GALLERY_TYPES_WITHOUT_LIGHTBOX.has(String(type || '').trim());
}

/**
 * Layouts where load-in animations / inView must not run (motion is owned by the layout).
 *
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITHOUT_LOADING_EFFECTS = new Set([
	'parallax-masonry',
	'story',
	'slider',
	'showcase',
	'template',
	'video',
]);

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithoutLoadingEffects(type) {
	return GALLERY_TYPES_WITHOUT_LOADING_EFFECTS.has(String(type || '').trim());
}

/**
 * Layouts where tile hover / effect-* classes must not apply.
 *
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITHOUT_HOVER_EFFECTS = new Set([
	'story',
	'slider',
]);

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithoutHoverEffects(type) {
	return GALLERY_TYPES_WITHOUT_HOVER_EFFECTS.has(String(type || '').trim());
}

/**
 * Layouts where Image Guardian / blur / zoom-on-hover / deeplink DOM chrome must not apply.
 *
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITHOUT_IMAGE_GUARDIAN = new Set(['video']);

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithoutImageGuardian(type) {
	return GALLERY_TYPES_WITHOUT_IMAGE_GUARDIAN.has(String(type || '').trim());
}

/**
 * Layouts that persist per-item `data-width` / `data-height` for packery / grid sizing.
 *
 * @type {ReadonlySet<string>}
 */
export const GALLERY_TYPES_WITH_ITEM_DIMENSIONS = new Set([
	'custom-grid',
	'creative-gallery',
	'grid',
	'uniform-grid',
	'fit-grid',
	'polaroid',
]);

/**
 * @param {string|undefined|null} type
 * @returns {boolean}
 */
export function isGalleryTypeWithItemDimensions(type) {
	return GALLERY_TYPES_WITH_ITEM_DIMENSIONS.has(String(type || '').trim());
}
