import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * Duplicate a gallery listing row via POST modula/v2/listing/{id}/duplicate.
 */
export function useDuplicateListingRowMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (item) => {
			const id = Number(item?.id);
			const type = item?.type || 'gallery';
			return apiFetch({
				path: `/modula/v2/listing/${id}/duplicate`,
				method: 'POST',
				data: { type },
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['modula-listing'] });
		},
	});
}
