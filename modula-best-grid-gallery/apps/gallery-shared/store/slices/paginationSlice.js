/**
 * Modula Gallery - Pagination slice
 * Syncs from RTK Query getItems.fulfilled when server-side.
 *
 * @package
 */

import { createSlice } from '@reduxjs/toolkit';
import { galleryApi } from '../api/galleryApi';

const initialState = {
	enabled: false,
	mode: 'page',
	type: 'client',
	perPage: 12,
	currentPage: 1,
	totalItems: 0,
	totalPages: 1,
	hasMore: false,
	loading: false,
};

const paginationSlice = createSlice({
	name: 'pagination',
	initialState,
	reducers: {
		setPagination: (state, action) => {
			Object.assign(state, action.payload);
		},
		setPage: (state, action) => {
			state.currentPage = action.payload;
		},
		setLoading: (state, action) => {
			state.loading = !!action.payload;
		},
		setHasMore: (state, action) => {
			state.hasMore = !!action.payload;
		},
		setPaginationTotals: (state, action) => {
			const { totalItems, totalPages, hasMore } = action.payload;
			if (totalItems !== undefined) {
				state.totalItems = totalItems;
			}
			if (totalPages !== undefined) {
				state.totalPages = totalPages;
			}
			if (hasMore !== undefined) {
				state.hasMore = hasMore;
			}
		},
	},
	extraReducers: (builder) => {
		builder.addMatcher(
			galleryApi.endpoints.getItems.matchFulfilled,
			(state, action) => {
				state.loading = false;
				const { pagination: resPagination, requestArg } =
					action.payload;
				if (
					requestArg?.type === 'pagination' &&
					(requestArg?.mode === 'infinite-scroll' ||
						requestArg?.mode === 'load-more')
				) {
					state.currentPage = requestArg.page ?? state.currentPage;
					state.hasMore = resPagination?.hasMore !== false;
				} else {
					state.currentPage = requestArg?.page ?? 1;
					if (resPagination) {
						if (resPagination.totalItems !== undefined) {
							state.totalItems = resPagination.totalItems;
						}
						if (resPagination.totalPages !== undefined) {
							state.totalPages = resPagination.totalPages;
						}
						if (resPagination.hasMore !== undefined) {
							state.hasMore = resPagination.hasMore;
						}
					}
				}
			}
		);
		builder.addMatcher(
			galleryApi.endpoints.getItems.matchPending,
			(state) => {
				state.loading = true;
			}
		);
		builder.addMatcher(
			galleryApi.endpoints.getItems.matchRejected,
			(state) => {
				state.loading = false;
			}
		);
	},
});

export const {
	setPagination,
	setPage,
	setLoading,
	setHasMore,
	setPaginationTotals,
} = paginationSlice.actions;
export default paginationSlice.reducer;
