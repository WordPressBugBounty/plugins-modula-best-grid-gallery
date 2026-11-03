import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {{ id?: number }} item
 */
export async function postClassicEditorPreference(item) {
	const id = Number(item?.id);
	return apiFetch({
		path: `/modula/v2/listing/${id}/classic-editor-preference`,
		method: 'POST',
	});
}

/**
 * Persist classic editor preference for a gallery listing row.
 */
export function useClassicEditorPreferenceMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: postClassicEditorPreference,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['modula-listing'] });
		},
	});
}
