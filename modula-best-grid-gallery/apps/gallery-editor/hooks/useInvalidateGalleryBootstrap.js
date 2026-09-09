import { useCallback } from '@wordpress/element';
import { useQueryClient } from '@tanstack/react-query';
import { getGalleryBootstrapQueryKey } from '../query/useGalleryBootstrapQuery';

/**
 * Invalidate live-preview bootstrap cache after gallery items change.
 *
 * @param {number} galleryId
 * @return {() => void}
 */
export function useInvalidateGalleryBootstrap(galleryId) {
	const queryClient = useQueryClient();

	return useCallback(() => {
		if (!galleryId) {
			return;
		}
		queryClient.invalidateQueries({
			queryKey: getGalleryBootstrapQueryKey(galleryId),
		});
	}, [galleryId, queryClient]);
}
