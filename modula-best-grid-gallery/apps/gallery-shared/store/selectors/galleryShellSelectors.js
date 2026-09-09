/**
 * Memoized selectors for Gallery shell subscriptions.
 *
 * @package
 */
import { createSelector } from '@reduxjs/toolkit';

const selectGallerySlice = (state) => state.gallery || {};
const selectFilteringSlice = (state) => state.filtering || {};
const selectPaginationSlice = (state) => state.pagination || {};
const selectItemsSlice = (state) => state.items || {};

export const selectGalleryShellState = createSelector(
	[
		selectGallerySlice,
		selectFilteringSlice,
		selectPaginationSlice,
		selectItemsSlice,
	],
	(gallery, filtering, pagination, items) => ({
		config: gallery.config || {},
		settings: gallery.settings || {},
		metadata: gallery.metadata || {},
		galleryId: gallery.galleryId,
		fetchFunction: gallery.fetchFunction,
		filtering,
		pagination,
		displayItems: items.filteredItems ?? items.items,
		items: items.items || [],
		originalItems: items.originalItems || [],
		filteredItems: items.filteredItems,
	})
);

export const selectGalleryDynamicStyleInputs = createSelector(
	[selectGallerySlice],
	(gallery) => ({
		galleryId: gallery.galleryId,
		groupedCaptions: gallery.settings?.captions || {},
		groupedStyle: gallery.settings?.style || {},
		groupedSocial: gallery.settings?.social || {},
		groupedLoading: gallery.settings?.loadingEffects || {},
		groupedFilters: gallery.settings?.filters || {},
		groupedPagination: gallery.settings?.pagination || {},
		groupedLightbox: gallery.settings?.lightbox || {},
		groupedVideo: gallery.settings?.video || {},
		groupedHover: gallery.settings?.hover || {},
		metadata: gallery.metadata || {},
		config: gallery.config || {},
	})
);
