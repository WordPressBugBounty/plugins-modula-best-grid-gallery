import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {number} attachmentId
 * @return {import('@tanstack/react-query').QueryKey}
 */
export function getWpMediaAttachmentQueryKey(attachmentId) {
	return ['wp', 'v2', 'media', attachmentId];
}

/**
 * @param {number}                attachmentId
 * @param {{ enabled?: boolean }} [options]
 */
export function useWpMediaAttachmentQuery(attachmentId, options = {}) {
	const { enabled = true } = options;
	return useQuery({
		queryKey: getWpMediaAttachmentQueryKey(attachmentId),
		enabled: Boolean(attachmentId) && enabled,
		staleTime: Infinity,
		gcTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		queryFn: () =>
			apiFetch({
				path: `/wp/v2/media/${attachmentId}`,
			}),
	});
}
