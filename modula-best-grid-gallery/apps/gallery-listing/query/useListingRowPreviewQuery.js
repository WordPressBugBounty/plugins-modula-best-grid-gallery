import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import {
	canShowListingRowPreview,
	listingRowPreviewPath,
} from '../listingRowPreviewPath';

/**
 * Lazy listing row preview (album members / gallery item thumbs).
 *
 * @param {{ item: Object, enabled?: boolean }} options
 */
export function useListingRowPreviewQuery({ item, enabled = false }) {
	const canPreview = canShowListingRowPreview(item);

	return useQuery({
		queryKey: [
			'modula-listing-row-preview',
			item?.type || 'gallery',
			Number(item?.id) || 0,
		],
		queryFn: async () => {
			return apiFetch({ path: listingRowPreviewPath(item) });
		},
		enabled: Boolean(enabled && canPreview && item?.id),
		staleTime: 60_000,
	});
}
