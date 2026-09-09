/**
 * Preview catalog commit — write gallery items into the settings-editor preview store.
 *
 * @package
 */

import { applyCoreItemsToPreviewStore } from './applyCoreItemsToPreviewStore';
import { asGalleryItemList } from './galleryItemIdentity';
import { paginationFromGroupedSettings } from './paginationFromSettings';
import { getForcedPreviewViewport } from './resolvePreviewViewport';
import { setPagination } from '../store/slices/paginationSlice';

/**
 * Refresh pagination totals from the current preview catalog and settings.
 * Does not rewrite gallery items.
 *
 * @param {import('@reduxjs/toolkit').Store} store Gallery preview store.
 * @return {void}
 */
export function refreshPreviewCatalogPaginationTotals(store) {
	if (!store) {
		return;
	}
	const state = store.getState();
	const catalog = asGalleryItemList(state?.items?.items ?? []);
	const settings = state?.gallery?.settings || {};
	const previewViewport = getForcedPreviewViewport(state?.gallery?.config);
	const derived = paginationFromGroupedSettings(settings, {
		totalItems: catalog.length,
		serverCatalog: false,
		...(previewViewport ? { previewViewport } : {}),
	});
	const currentPagination = state?.pagination || {};
	store.dispatch(
		setPagination({
			...currentPagination,
			perPage: derived.perPage,
			totalItems: catalog.length,
			totalPages: derived.enabled
				? Math.max(1, Math.ceil(catalog.length / derived.perPage))
				: 1,
		})
	);
}

/**
 * Write a core preview catalog and refresh pagination totals from current settings.
 * Does not persist, patch the bootstrap query, or merge embedded rows.
 *
 * @param {import('@reduxjs/toolkit').Store} store     Gallery preview store.
 * @param {unknown}                          coreItems Preview catalog (gallery items).
 * @return {void}
 */
export function commitPreviewCatalog(store, coreItems) {
	if (!store) {
		return;
	}
	applyCoreItemsToPreviewStore(store, coreItems);
	refreshPreviewCatalogPaginationTotals(store);
}
