/**
 * Modula Gallery - Build preloaded Redux state from raw JSON data
 *
 * Baseline: initial items and settings come from the DOM – PHP prints a JSON
 * object in a <script type="application/json"> tag next to the gallery.
 * Settings are grouped (v2). We derive config from settings for the UI.
 *
 * @package
 */

import { asGalleryItemList } from './galleryItemIdentity';
import {
	DEFAULT_GALLERY_TYPE,
	isGalleryTypeWithoutFilters,
	isGalleryTypeWithoutPagination,
} from '../constants/galleryLayoutDefaults';
import { normalizeGalleryDomId } from './galleryRootSelector';
import {
	deriveGalleryConfig,
	galleryConfigExtrasFromPreloadData,
} from './deriveGalleryConfig';
import {
	clientPaginationTotals,
	getPageSlice,
	isAppendPaginationMode,
} from '../store/clientLogic';
import {
	isPaginationModeEnabledFromFlatLike,
	paginationFlatFromGroupedSettings,
	paginationFromGroupedSettings,
} from './paginationFromSettings';
import { isSettingsEditorPreview } from './displayContext';
import { buildFilteringFromSettings } from './filterBarModel';

/**
 * Build fetchFunction for server-side pagination/filter (REST modula/v2/gallery/{id}/items).
 *
 * @param {string}                itemsUrl    Absolute or relative REST URL from PHP catalogApi.itemsUrl.
 * @param {number|null|undefined} shuffleSeed Seed from bootstrap metadata when shuffle on load is enabled.
 * @return {null|(function(Object): Promise<Object>)} Fetcher, or null if URL missing.
 */
export function buildCatalogFetchFunction(itemsUrl, shuffleSeed) {
	if (!itemsUrl || typeof itemsUrl !== 'string') {
		return null;
	}
	return async (params) => {
		const origin =
			typeof window !== 'undefined' ? window.location.origin : '';
		const url = new URL(itemsUrl, origin || 'http://localhost');
		if (params.all === true) {
			url.searchParams.set('all', '1');
		} else {
			url.searchParams.set('page', String(params.page ?? 1));
			url.searchParams.set('per_page', String(params.perPage ?? 12));
		}
		const filters = params.filters ?? [];
		if (Array.isArray(filters) && filters.length > 0) {
			url.searchParams.set('filters', JSON.stringify(filters));
		}
		const seed =
			typeof shuffleSeed === 'number' && shuffleSeed > 0
				? shuffleSeed
				: null;
		if (seed !== null) {
			url.searchParams.set('shuffle_seed', String(seed));
		}
		const res = await fetch(url.toString(), { credentials: 'same-origin' });
		if (!res.ok) {
			let message = res.statusText;
			try {
				const errBody = await res.json();
				if (errBody?.message) {
					message = errBody.message;
				}
			} catch {
				// ignore
			}
			throw new Error(message || `HTTP ${res.status}`);
		}
		return res.json();
	};
}

/**
 * Normalize raw gallery data into preloaded state (mirrors DataManager logic).
 * Used at bootstrap: loadGalleryData(element) → buildPreloadedState(data, element) → createGalleryStore(preloadedState).
 *
 * @param {Object}      data    - Raw gallery data from script tag (PHP output). data.settings = grouped (v2).
 * @param {HTMLElement} element - Gallery container (for galleryId fallback)
 * @return {Object} Preloaded state for configureStore
 */
export function buildPreloadedState(data, element) {
	const settings = data.settings || {};

	const rawItems = Array.isArray(data.items) ? data.items : [];
	const metadata = { ...(data.metadata || {}) };
	const isSettingsEditorPreviewContext = isSettingsEditorPreview(metadata);
	const bootstrapPagination =
		data.pagination && typeof data.pagination === 'object'
			? { ...data.pagination }
			: {};

	let effectivePaginationBootstrap = bootstrapPagination;
	const shouldDerivePaginationFromSettings = Object.keys(settings).length > 0;

	if (shouldDerivePaginationFromSettings) {
		const paginationModeOn = isPaginationModeEnabledFromFlatLike(
			paginationFlatFromGroupedSettings(settings)
		);
		let serverCatalogForDerive =
			paginationModeOn &&
			(bootstrapPagination.type === 'server' ||
				metadata.catalogPaged === true);
		if (isSettingsEditorPreviewContext) {
			serverCatalogForDerive = false;
		}
		const totalImagesForPagination = serverCatalogForDerive
			? Number(bootstrapPagination.totalItems ?? rawItems.length)
			: rawItems.length;
		const previewViewportForPagination =
			data.previewViewport === 'desktop' ||
			data.previewViewport === 'tablet' ||
			data.previewViewport === 'mobile'
				? data.previewViewport
				: undefined;
		const derivedPagination = paginationFromGroupedSettings(settings, {
			totalItems: totalImagesForPagination,
			serverCatalog: serverCatalogForDerive,
			...(previewViewportForPagination
				? { previewViewport: previewViewportForPagination }
				: {}),
		});
		effectivePaginationBootstrap = {
			...bootstrapPagination,
			...derivedPagination,
		};
		if (
			isSettingsEditorPreviewContext &&
			derivedPagination.enabled &&
			isAppendPaginationMode(derivedPagination.mode)
		) {
			effectivePaginationBootstrap.type = 'client';
		}
	}

	const galleryId =
		normalizeGalleryDomId(
			metadata.galleryId ||
				(element &&
					(element.id || element.getAttribute('data-gallery-id'))) ||
				null
		) || null;

	const config = deriveGalleryConfig(
		settings,
		galleryConfigExtrasFromPreloadData(data, galleryId)
	);

	const paginationMode = effectivePaginationBootstrap.mode || 'page';
	const paginationType = effectivePaginationBootstrap.type || 'client';

	const visitorPaginationEnabled = isSettingsEditorPreviewContext
		? false
		: effectivePaginationBootstrap.enabled || false;

	let isServerCatalog =
		visitorPaginationEnabled &&
		(effectivePaginationBootstrap.type === 'server' ||
			data.metadata?.catalogPaged === true);
	if (isSettingsEditorPreviewContext) {
		isServerCatalog = false;
	}

	const pagination = {
		enabled: visitorPaginationEnabled,
		mode: paginationMode,
		type: paginationType,
		perPage: effectivePaginationBootstrap.perPage || 12,
		currentPage: effectivePaginationBootstrap.currentPage || 1,
		totalItems: isServerCatalog
			? Number(effectivePaginationBootstrap.totalItems ?? rawItems.length)
			: rawItems.length,
		totalPages: isServerCatalog
			? Math.max(1, Number(effectivePaginationBootstrap.totalPages ?? 1))
			: 1,
		hasMore: false,
		loading: false,
	};

	const previewFiltering = isSettingsEditorPreviewContext
		? buildFilteringFromSettings(settings)
		: null;

	const filtering = previewFiltering || {
		enabled: data.filtering?.enabled || false,
		type: data.filtering?.type || 'client',
		activeFilters: [],
		availableFilters: data.filtering?.availableFilters || [],
	};

	// Initial display items: client pagination slices the first page only.
	let items = [...rawItems];
	if (pagination.enabled && pagination.type === 'client') {
		if (pagination.mode === 'page') {
			items = getPageSlice(
				rawItems,
				pagination.currentPage,
				pagination.perPage
			);
			const totals = clientPaginationTotals(
				rawItems.length,
				pagination.perPage
			);
			pagination.totalItems = totals.totalItems;
			pagination.totalPages = totals.totalPages;
		} else if (isAppendPaginationMode(pagination.mode)) {
			items = getPageSlice(rawItems, 1, pagination.perPage);
			const totals = clientPaginationTotals(
				rawItems.length,
				pagination.perPage
			);
			pagination.totalItems = totals.totalItems;
			pagination.totalPages = totals.totalPages;
			pagination.hasMore = pagination.currentPage < pagination.totalPages;
		}
	}

	if (isServerCatalog) {
		pagination.hasMore = pagination.currentPage < pagination.totalPages;
	}

	const layoutType = config.type || DEFAULT_GALLERY_TYPE;
	const skipFilters = isGalleryTypeWithoutFilters(layoutType);
	const skipPagination = isGalleryTypeWithoutPagination(layoutType);

	if (skipFilters) {
		filtering.enabled = false;
		filtering.type = 'client';
		filtering.activeFilters = [];
	}

	if (skipPagination && !isSettingsEditorPreviewContext) {
		pagination.enabled = false;
		pagination.type = 'client';
		pagination.mode = 'page';
		pagination.currentPage = 1;
		pagination.totalItems = rawItems.length;
		pagination.totalPages = 1;
		pagination.hasMore = false;
		isServerCatalog = false;
		items = [...rawItems];
	}

	if (isSettingsEditorPreviewContext) {
		items = asGalleryItemList(items);
	}

	const catalogFetch = isSettingsEditorPreviewContext
		? null
		: buildCatalogFetchFunction(
				data.catalogApi?.itemsUrl,
				metadata.shuffleSeed
			);

	const catalogFetchResolved = isSettingsEditorPreviewContext
		? null
		: data.fetchFunction || catalogFetch || null;

	const needsCatalogItemsFetch =
		isServerCatalog || (filtering.enabled && filtering.type === 'server');

	return {
		gallery: {
			settings,
			config,
			metadata,
			galleryId,
			fetchFunction: needsCatalogItemsFetch ? catalogFetchResolved : null,
		},
		items: {
			items,
			originalItems: isSettingsEditorPreviewContext
				? asGalleryItemList(rawItems)
				: [...rawItems],
			filteredItems: null,
		},
		pagination,
		filtering,
	};
}
