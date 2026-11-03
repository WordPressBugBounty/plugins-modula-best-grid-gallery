import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { viewToListingQuery } from '../viewToListingQuery';

/**
 * @param {import('../viewToListingQuery').ListingView} view
 */
export function useListingQuery(view) {
	const queryArgs = viewToListingQuery(view);

	return useQuery({
		queryKey: ['modula-listing', queryArgs],
		queryFn: async () => {
			const path = addQueryArgs('/modula/v2/listing', queryArgs);
			return apiFetch({ path });
		},
	});
}
