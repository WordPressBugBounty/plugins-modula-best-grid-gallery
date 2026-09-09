import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { normalizeGalleryPostId } from './useGalleryBootstrapQuery';

/**
 * GET modula/v2/gallery/{id}/settings — full grouped v2 payload.
 *
 * @param {number} galleryId Gallery post ID.
 */
export function useGallerySettingsV2Query(galleryId) {
	const id = normalizeGalleryPostId(galleryId);
	return useQuery({
		queryKey: ['modula', 'gallery-settings-v2', id],
		enabled: Boolean(id),
		queryFn: async () =>
			apiFetch({
				path: `modula/v2/gallery/${id}/settings`,
			}),
	});
}
