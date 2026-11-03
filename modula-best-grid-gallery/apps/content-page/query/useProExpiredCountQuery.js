import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { proExpiredCountQuery } from '../listingProExpired';

/**
 * Galleries that show PRO expired, across all pages. Under the listing key,
 * so every listing invalidation (trash, restore, duplicate, save) refreshes it.
 *
 * @param {string[]} typeKeys From getProExpiredTypeKeys(); empty skips the request.
 */
export function useProExpiredCountQuery(typeKeys) {
	return useQuery({
		queryKey: ['modula-listing', 'pro-expired', typeKeys],
		queryFn: () =>
			apiFetch({
				path: addQueryArgs(
					'/modula/v2/listing',
					proExpiredCountQuery(typeKeys)
				),
			}),
		enabled: typeKeys.length > 0,
		select: (response) => Number(response?.pagination?.total) || 0,
	});
}
