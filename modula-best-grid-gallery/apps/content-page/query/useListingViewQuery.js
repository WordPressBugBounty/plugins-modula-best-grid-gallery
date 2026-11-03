import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * Load persisted gallery listing view preferences for the current user.
 */
export function useListingViewQuery() {
	return useQuery({
		queryKey: ['modula-listing-view'],
		queryFn: async () =>
			apiFetch({
				path: '/modula/v2/listing/view',
			}),
		staleTime: Infinity,
	});
}
