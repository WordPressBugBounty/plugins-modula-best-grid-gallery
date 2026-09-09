import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {{ id?: number }} item
 */
export async function postTryBetaGallery(item) {
	const id = Number(item?.id);
	return apiFetch({
		path: `/modula/v2/listing/${id}/try-beta`,
		method: 'POST',
	});
}

/**
 * Duplicate a classic gallery as Beta (Try the beta) via POST modula/v2/listing/{id}/try-beta.
 */
export function useTryBetaGalleryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: postTryBetaGallery,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['modula-listing'] });
		},
	});
}
