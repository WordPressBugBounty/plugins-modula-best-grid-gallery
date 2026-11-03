import { useInfiniteQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { buildMediaLibraryPath } from '../components/add-media/mediaLibraryQuery';

/**
 * @typedef {{ rows: unknown[], page: number, total: number, totalPages: number }} MediaLibraryPage
 */

/**
 * One page of `GET /wp/v2/media`, with the totals from the response headers.
 *
 * @param {Parameters<typeof buildMediaLibraryPath>[0]} filters
 * @param {AbortSignal}                                 [signal]
 * @return {Promise<MediaLibraryPage>} The page's rows and totals.
 */
async function fetchMediaLibraryPage(filters, signal) {
	const response = await apiFetch({
		path: buildMediaLibraryPath(filters),
		parse: false,
		signal,
	});
	const rows = await response.json();

	return {
		rows: Array.isArray(rows) ? rows : [],
		page: filters.page,
		total: Number(response.headers.get('X-WP-Total')) || 0,
		totalPages: Number(response.headers.get('X-WP-TotalPages')) || 0,
	};
}

/**
 * Images in the media library for the Add media dialog, one bounded page at
 * a time ("Load more" fetches the next).
 *
 * @param {{ search: string, month: string }} filters
 */
export function useMediaLibraryQuery({ search, month }) {
	return useInfiniteQuery({
		queryKey: ['wp', 'v2', 'media', 'add-media', { search, month }],
		initialPageParam: 1,
		queryFn: ({ pageParam, signal }) =>
			fetchMediaLibraryPage({ page: pageParam, search, month }, signal),
		getNextPageParam: (lastPage) =>
			lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
		// Uploads made elsewhere show on the next open.
		staleTime: 0,
		refetchOnWindowFocus: false,
	});
}
