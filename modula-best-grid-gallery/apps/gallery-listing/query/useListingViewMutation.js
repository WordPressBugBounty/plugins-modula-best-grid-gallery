import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { pickPersistedView } from '../listingViewPersistence';

/**
 * Save persisted gallery listing view preferences for the current user.
 */
export function useListingViewMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (view) =>
			apiFetch({
				path: '/modula/v2/listing/view',
				method: 'PUT',
				data: pickPersistedView(view),
			}),
		onSuccess: (data) => {
			queryClient.setQueryData(['modula-listing-view'], data);
		},
	});
}
