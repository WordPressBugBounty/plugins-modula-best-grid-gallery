import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {{ id?: number }} item
 */
export async function postConvertBetaGallery(item) {
	const id = Number(item?.id);
	return apiFetch({
		path: `/modula/v2/listing/${id}/convert-beta`,
		method: 'POST',
	});
}

/**
 * Convert a classic gallery to Beta in place via POST modula/v2/listing/{id}/convert-beta.
 */
export function useConvertBetaGalleryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: postConvertBetaGallery,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['modula-listing'] });
		},
	});
}
