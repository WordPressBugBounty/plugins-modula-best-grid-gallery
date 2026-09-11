import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
	LISTING_ROW_POST_DOCUMENT_INVALIDATE,
	putListingRowPostDocument,
} from '../listingRowPostDocument';

/**
 * Save a listing row’s post document (title / status / slug) via CPT REST.
 * Invalidates the listing query so refreshed rows show the new values.
 */
export function useListingRowPostDocumentMutation({
	refreshListing = true,
} = {}) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ item, document }) =>
			putListingRowPostDocument(item, document),
		onSuccess: () => {
			return queryClient.invalidateQueries({
				...LISTING_ROW_POST_DOCUMENT_INVALIDATE,
				...(refreshListing ? {} : { refetchType: 'none' }),
			});
		},
	});
}
