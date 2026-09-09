import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import {
	getGalleryBootstrapQueryKey,
	normalizeGalleryPostId,
} from './useGalleryBootstrapQuery';
import { stripRestPostMeta } from '../utils/applyRestPostStatus';

/**
 * PATCH grouped settings; replaces query cache with sanitized response.
 *
 * @param {number} galleryId Post ID.
 */
export function usePatchGallerySettingsV2Mutation(galleryId) {
	const queryClient = useQueryClient();
	const id = normalizeGalleryPostId(galleryId);
	return useMutation({
		mutationFn: async (body) =>
			apiFetch({
				path: `modula/v2/gallery/${id}/settings`,
				method: 'PATCH',
				data: body,
			}),
		onSuccess: (data) => {
			const grouped = stripRestPostMeta(data);
			queryClient.setQueryData(
				['modula', 'gallery-settings-v2', id],
				grouped
			);
			// Settings-only PATCH must not refetch bootstrap items — that overwrites
			// optimistic Redux rows (v2 embedded tiles) when modula_images_v2 lags.
			queryClient.setQueryData(
				getGalleryBootstrapQueryKey(id),
				(old) => {
					if (!old || typeof old !== 'object') {
						return old;
					}
					return {
						...old,
						settings: grouped,
					};
				}
			);
		},
	});
}
