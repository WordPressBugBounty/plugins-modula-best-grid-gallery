/**
 * Modula Gallery - RTK Query API slice
 *
 * Used only for subsequent server-side operations (pagination, filter, load more).
 * Initial items come from preloaded state (PHP-printed JSON in the page); we never
 * call this API on first paint. When API endpoints exist, queryFn can call them
 * (or we switch to fetchBaseQuery with the REST base URL).
 *
 * @see https://redux-toolkit.js.org/rtk-query/overview
 *
 * @package
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Custom queryFn: calls state.gallery.fetchFunction (optional, set by shortcode).
 * When API endpoints exist, replace this with a call to the REST API.
 * @param arg
 * @param root0
 * @param root0.getState
 */
async function galleryItemsQueryFn(arg, { getState }) {
	const state = getState();
	const fetchFn = state.gallery?.fetchFunction;
	if (typeof fetchFn !== 'function') {
		return {
			error: { status: 'no-fetch', message: 'No fetch function' },
		};
	}

	try {
		const params = {
			type: arg.type || 'pagination',
			page: arg.page ?? 1,
			perPage: arg.perPage ?? 12,
			filters: arg.filters ?? [],
		};
		if (arg.type === 'pagination') {
			params.mode = arg.mode || 'page';
		}
		const response = await fetchFn(params);
		if (response && Array.isArray(response.items)) {
			return {
				data: {
					items: response.items,
					pagination: response.pagination ?? {},
					requestArg: arg,
				},
			};
		}
		return { error: { status: 'parse', message: 'Invalid response' } };
	} catch (e) {
		return {
			error: { status: 'error', message: e?.message || 'Request failed' },
		};
	}
}

export const galleryApi = createApi({
	reducerPath: 'galleryApi',
	// Required by createApi; getItems uses queryFn so this is not called for that endpoint
	baseQuery: fetchBaseQuery({ baseUrl: '/' }),
	endpoints: (build) => ({
		/**
		 * Fetch gallery items (pagination or filter).
		 * Arg: { type: 'pagination'|'filter', mode?: 'page'|'infinite-scroll', page, perPage, filters }
		 * Fulfilled result is synced to items/pagination slices via extraReducers.
		 */
		getItems: build.query({
			queryFn: galleryItemsQueryFn,
			keepUnusedDataFor: 0,
		}),
	}),
});

export const { useLazyGetItemsQuery, useGetItemsQuery } = galleryApi;
