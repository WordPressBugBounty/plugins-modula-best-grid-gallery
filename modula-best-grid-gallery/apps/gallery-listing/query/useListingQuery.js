import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { getGalleryListingConfig } from '../config';
import { sanitizeListingOnlyShowFilters } from '../listingToolbarView';
import { viewToListingQuery } from '../viewToListingQuery';

/**
 * @param {import('../viewToListingQuery').ListingView} view
 */
export function useListingQuery(view) {
	const config = getGalleryListingConfig();
	const queryArgs = viewToListingQuery(
		sanitizeListingOnlyShowFilters(view, {
			hasAlbums: config.hasAlbums,
			isPro: config.isPro,
		})
	);

	return useQuery({
		queryKey: ['modula-listing', queryArgs],
		queryFn: async () => {
			const path = addQueryArgs('/modula/v2/listing', queryArgs);
			return apiFetch({ path });
		},
	});
}
