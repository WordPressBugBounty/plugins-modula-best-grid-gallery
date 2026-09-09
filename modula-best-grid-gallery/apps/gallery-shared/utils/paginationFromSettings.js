/**
 * Derive pagination bootstrap fields from grouped v2 settings.
 * Redux `enabled` follows the settings UI master toggle (`enablePagination`).
 * Nested infinite scroll / load-more only apply when that toggle is on.
 * `maxImagesCount` alone does not turn pagination on, so default saved counts do not hide images.
 *
 * @package
 */

import { isInfiniteScrollSupportedForGalleryType } from './galleryLayoutEditorSupport';
import { isGalleryTypeWithoutPagination } from '../constants/galleryLayoutDefaults';

/**
 * @param {unknown} v
 * @return {boolean} True when the UI flag is in an “on” state.
 */
function isTruthyPaginationFlag(v) {
	if (v === true || v === 1 || v === '1') {
		return true;
	}
	if (typeof v === 'string' && v.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * Rough mobile match for per-page (parity with wp_is_mobile() in PHP).
 * @return {boolean} True when the viewport is treated as mobile (narrow).
 */
function isLikelyMobileViewport() {
	if (typeof window === 'undefined') {
		return false;
	}
	try {
		return window.matchMedia('(max-width: 782px)').matches;
	} catch {
		return false;
	}
}

/**
 * Whether to use maxImagesCount_mobile.
 * Settings-editor preview forces mobile only when previewViewport is `mobile`
 * (tablet uses desktop count — same idea as PHP wp_is_mobile()).
 *
 * @param {{
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   forceMobile?: boolean,
 * }} [options]
 * @return {boolean}
 */
function shouldUseMobilePerPage(options = {}) {
	if (typeof options.forceMobile === 'boolean') {
		return options.forceMobile;
	}
	const viewport = options.previewViewport;
	if (viewport === 'mobile') {
		return true;
	}
	if (viewport === 'desktop' || viewport === 'tablet') {
		return false;
	}
	return isLikelyMobileViewport();
}

/**
 * @param {Record<string, unknown>} flat
 * @param {{
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   forceMobile?: boolean,
 * }} [options]
 * @return {number} 0 when unset / unlimited
 */
export function resolvePerPageFromFlatLike(flat, options = {}) {
	const mobile = shouldUseMobilePerPage(options);
	const mMobile = flat.maxImagesCount_mobile;
	const mDesk = flat.maxImagesCount;
	if (
		mobile &&
		mMobile !== undefined &&
		mMobile !== null &&
		mMobile !== '' &&
		!Number.isNaN(Number(mMobile)) &&
		Number(mMobile) > 0
	) {
		return Math.floor(Number(mMobile));
	}
	if (
		mDesk !== undefined &&
		mDesk !== null &&
		mDesk !== '' &&
		!Number.isNaN(Number(mDesk)) &&
		Number(mDesk) > 0
	) {
		return Math.floor(Number(mDesk));
	}
	return 0;
}

function isTruthyPaginationSettingValue(val) {
	if (
		val === undefined ||
		val === null ||
		val === false ||
		val === 0 ||
		val === '0' ||
		val === ''
	) {
		return false;
	}
	if (typeof val === 'string') {
		const t = val.toLowerCase().trim();
		if (t === 'false' || t === 'no' || t === 'off' || t === '0') {
			return false;
		}
	}
	return true;
}

/**
 * Master pagination toggle (`enablePagination`). Nested infinite scroll / load-more
 * are ignored when this is off (matches sidebar form-rules and toggleWithNested drill-in).
 * Does not treat `maxImagesCount` alone as pagination on.
 *
 * @param {Record<string, unknown>} flat
 * @return {boolean} True when the Pagination hub toggle is on.
 */
export function isPaginationModeEnabledFromFlatLike(flat) {
	return isNumberedPaginationEnabledFromFlatLike(flat);
}

/**
 * Same idea as PHP `Modern_Gallery::is_any_pagination_enabled` (includes max-per-page).
 *
 * @param {Record<string, unknown>} flat
 * @param {{
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   forceMobile?: boolean,
 * }} [options]
 * @return {boolean} True when max-per-page or any pagination mode is active.
 */
export function isAnyPaginationEnabledFromFlatLike(flat, options = {}) {
	if (resolvePerPageFromFlatLike(flat, options) > 0) {
		return true;
	}
	return isPaginationModeEnabledFromFlatLike(flat);
}

/**
 * Flat pagination keys from grouped `settings.pagination` (modula_settings_v2).
 *
 * @param {Object} settings Grouped v2 settings.
 * @return {Record<string, unknown>} Shape compatible with resolvePerPage / isAnyEnabled helpers.
 */
export function paginationFlatFromGroupedSettings(settings) {
	const pg =
		settings &&
		typeof settings === 'object' &&
		settings.pagination &&
		typeof settings.pagination === 'object'
			? settings.pagination
			: {};
	return {
		maxImagesCount: pg.maxImagesCount,
		maxImagesCount_mobile: pg.maxImagesCountMobile,
		enable_pagination: pg.enablePagination,
		enable_infinite_scroll: pg.enableInfiniteScroll,
		enable_load_more: pg.enableLoadMore,
	};
}

/**
 * Master “Pagination” hub toggle (`enablePagination`).
 *
 * @param {Record<string, unknown>} flat
 * @return {boolean}
 */
export function isNumberedPaginationEnabledFromFlatLike(flat) {
	return isTruthyPaginationFlag(flat.enable_pagination);
}

/**
 * Whether the settings-editor live preview should show page-break dividers.
 * Any enabled Pagination mode (numbered pages, load more, infinite scroll) uses
 * full-gallery dividers in the editor — visitor chrome is not used there.
 *
 * @param {Object} settings Grouped v2 settings.
 * @return {boolean}
 */
export function editorPreviewUsesNumberedPageBreakDividers(settings) {
	const flat = paginationFlatFromGroupedSettings(settings);
	return isNumberedPaginationEnabledFromFlatLike(flat);
}

/**
 * Step (items per “page”) for settings-editor preview dividers, or null when pagination is off.
 * Applies to numbered pages, load more, and infinite scroll so the editor always shows every image.
 *
 * @param {Object} settings Grouped v2 settings.
 * @param {{
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   forceMobile?: boolean,
 * }} [options]
 * @return {number|null} Positive step, or null when pagination is off.
 */
export function editorPreviewPageBreakStep(settings, options = {}) {
	if (!editorPreviewUsesNumberedPageBreakDividers(settings)) {
		return null;
	}
	const flat = paginationFlatFromGroupedSettings(settings);
	let per = resolvePerPageFromFlatLike(flat, options);
	if (per <= 0) {
		per = 12;
	}
	return Math.max(1, per);
}

/**
 * Boundary pages always kept when the numbered bar is truncated (first / last).
 * Keep in sync with `buildPaginationLinkItems`.
 */
export const PAGINATION_BOUNDARY_COUNT = 1;

/**
 * Minimum siblings on each side of the active page (MUI-style floor).
 * Keep in sync with `buildPaginationLinkItems`.
 */
export const PAGINATION_MIN_SIBLING_COUNT = 1;

/**
 * Structural floor for numbered page buttons when truncated:
 * first + last + (active ± min siblings).
 * Mirror this as `pagination.paginationNumber` minimum/default in settings-v2-document.php.
 */
export const MIN_PAGINATION_PAGE_LINKS =
	2 * PAGINATION_BOUNDARY_COUNT + (2 * PAGINATION_MIN_SIBLING_COUNT + 1);

/** Schema maximum for `paginationNumber`. */
export const MAX_PAGINATION_PAGE_LINKS = 20;

/**
 * Numbered page links shown in pagination chrome (`paginationNumber`).
 *
 * @param {Object} paginationSettings Grouped `settings.pagination`.
 * @param {number} [fallback=MIN_PAGINATION_PAGE_LINKS] Schema default when unset.
 * @return {number}
 */
export function resolvePaginationNumber(
	paginationSettings = {},
	fallback = MIN_PAGINATION_PAGE_LINKS
) {
	const raw = Number(paginationSettings?.paginationNumber);
	if (!Number.isNaN(raw) && raw >= 1) {
		return Math.min(
			MAX_PAGINATION_PAGE_LINKS,
			Math.max(MIN_PAGINATION_PAGE_LINKS, Math.floor(raw))
		);
	}
	return Math.min(
		MAX_PAGINATION_PAGE_LINKS,
		Math.max(
			MIN_PAGINATION_PAGE_LINKS,
			Math.floor(Number(fallback) || MIN_PAGINATION_PAGE_LINKS)
		)
	);
}

/**
 * Numbered page buttons for pagination chrome (MUI-style boundaries + siblings + ellipsis).
 * The active page is always visible. Small page counts show every page.
 *
 * @param {number} currentPage 1-based active page
 * @param {number} totalPages
 * @param {number} maxLinks    `paginationNumber` — target numbered-button budget
 * @return {Array<{ type: 'page', page: number } | { type: 'ellipsis' }>}
 */
export function buildPaginationLinkItems(currentPage, totalPages, maxLinks) {
	const count = Math.max(1, Math.floor(Number(totalPages)) || 1);
	const page = Math.min(
		Math.max(1, Math.floor(Number(currentPage)) || 1),
		count
	);
	const max = Math.max(
		MIN_PAGINATION_PAGE_LINKS,
		Math.min(
			MAX_PAGINATION_PAGE_LINKS,
			Math.floor(Number(maxLinks)) || MIN_PAGINATION_PAGE_LINKS
		)
	);

	/** @param {number} start @param {number} end inclusive, 1-based page numbers */
	const range = (start, end) => {
		const from = Math.max(1, start);
		const to = Math.min(count, end);
		if (from > to) {
			return [];
		}
		return Array.from({ length: to - from + 1 }, (_, i) => from + i);
	};

	const allPages = () =>
		Array.from({ length: count }, (_, i) => ({
			type: 'page',
			page: i + 1,
		}));

	if (count <= max + 1) {
		return allPages();
	}

	const boundaryCount = PAGINATION_BOUNDARY_COUNT;
	// Scale sibling window with “page links shown”; never below the structural floor.
	const siblingCount = Math.max(
		PAGINATION_MIN_SIBLING_COUNT,
		Math.floor((max - 1) / 2)
	);
	const pageIndex = page - 1;

	const startPages = range(1, Math.min(boundaryCount, count));
	const endPages = range(
		Math.max(count - boundaryCount + 1, boundaryCount + 1),
		count
	);

	const siblingsStart = Math.max(
		Math.min(
			pageIndex - siblingCount,
			count - boundaryCount - siblingCount * 2 - 1
		),
		boundaryCount + 1
	);

	const siblingsEnd = Math.min(
		Math.max(
			pageIndex + siblingCount,
			boundaryCount + siblingCount * 2 + 1
		),
		endPages.length > 0 ? endPages[0] - 1 : count - 1
	);

	/** @type {Array<number | 'ellipsis'>} */
	const raw = [];

	raw.push(...startPages);

	if (siblingsStart > boundaryCount + 1) {
		raw.push('ellipsis');
	} else {
		raw.push(...range(boundaryCount + 1, siblingsStart - 1));
	}

	if (siblingsStart <= siblingsEnd) {
		raw.push(...range(siblingsStart, siblingsEnd));
	}

	if (siblingsEnd < count - boundaryCount) {
		raw.push('ellipsis');
	} else {
		raw.push(...range(siblingsEnd + 1, count - boundaryCount));
	}

	raw.push(...endPages);

	/** @type {Array<{ type: 'page', page: number } | { type: 'ellipsis' }>} */
	const items = [];
	let lastPage = null;

	raw.forEach((entry) => {
		if (entry === 'ellipsis') {
			if (items.length && items[items.length - 1].type === 'ellipsis') {
				return;
			}
			items.push({ type: 'ellipsis' });
			return;
		}

		if (entry === lastPage) {
			return;
		}

		if (lastPage !== null && entry - lastPage === 1) {
			const tail = items[items.length - 1];
			if (tail?.type === 'ellipsis') {
				items.pop();
			}
		}

		lastPage = entry;
		items.push({ type: 'page', page: entry });
	});

	if (!items.some((item) => item.type === 'page' && item.page === page)) {
		return allPages();
	}

	return items;
}

/**
 * Build pagination slice fields from grouped settings.pagination (and totals from bootstrap).
 *
 * @param {Object}  settings              Grouped v2 settings.
 * @param {Object}  options
 * @param {number}  options.totalItems    Item count for totalPages (full gallery or first page + meta).
 * @param {boolean} options.serverCatalog Same as bootstrap server paging.
 * @param {'desktop'|'tablet'|'mobile'} [options.previewViewport] Settings-editor forced viewport.
 * @param {boolean} [options.forceMobile] Explicit mobile override.
 * @return {Object} Partial pagination payload (enabled, mode, type, perPage, currentPage, totalItems, totalPages).
 */
export function paginationFromGroupedSettings(settings, options = {}) {
	const {
		totalItems = 0,
		serverCatalog = false,
		previewViewport,
		forceMobile,
	} = options;
	const flat = paginationFlatFromGroupedSettings(settings);
	const perPageOptions = {};
	if (previewViewport !== undefined) {
		perPageOptions.previewViewport = previewViewport;
	}
	if (typeof forceMobile === 'boolean') {
		perPageOptions.forceMobile = forceMobile;
	}

	let perPage = resolvePerPageFromFlatLike(flat, perPageOptions);
	if (perPage <= 0) {
		perPage = 12;
	}

	const galleryType =
		settings &&
		typeof settings === 'object' &&
		settings.general &&
		typeof settings.general.type === 'string'
			? settings.general.type
			: '';

	const enabled = isGalleryTypeWithoutPagination(galleryType)
		? false
		: isPaginationModeEnabledFromFlatLike(flat);

	let mode = 'page';
	if (
		enabled &&
		isInfiniteScrollSupportedForGalleryType(galleryType, settings) &&
		isTruthyPaginationFlag(flat.enable_infinite_scroll)
	) {
		mode = 'infinite-scroll';
	} else if (enabled && isTruthyPaginationFlag(flat.enable_load_more)) {
		mode = 'load-more';
	}

	const type = serverCatalog && enabled ? 'server' : 'client';

	let totalPages =
		enabled && perPage > 0 ? Math.ceil(Number(totalItems) / perPage) : 1;
	if (totalPages < 1) {
		totalPages = 1;
	}

	return {
		enabled,
		mode,
		type,
		perPage,
		currentPage: 1,
		totalItems,
		totalPages,
	};
}
