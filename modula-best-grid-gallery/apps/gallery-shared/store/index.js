/**
 * Modula Gallery - RTK Store
 * Includes RTK Query galleryApi for server-side fetching.
 *
 * @package
 */

import { configureStore } from '@reduxjs/toolkit';
import galleryReducer from './slices/gallerySlice';
import itemsReducer from './slices/itemsSlice';
import paginationReducer from './slices/paginationSlice';
import filteringReducer from './slices/filteringSlice';
import { galleryApi } from './api/galleryApi';

/**
 * Create store with optional preloaded state (for initial gallery data).
 *
 * @param {Object} preloadedState - Optional preloaded state
 * @return {Object} Redux store
 */
export function createGalleryStore(preloadedState = undefined) {
	return configureStore({
		reducer: {
			gallery: galleryReducer,
			items: itemsReducer,
			pagination: paginationReducer,
			filtering: filteringReducer,
			[galleryApi.reducerPath]: galleryApi.reducer,
		},
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				serializableCheck: {
					ignoredPaths: [
						// Bound fetch passed from PHP/bootstrap for server pagination/filter.
						'gallery.fetchFunction',
					],
				},
			}).concat(galleryApi.middleware),
		preloadedState,
	});
}
