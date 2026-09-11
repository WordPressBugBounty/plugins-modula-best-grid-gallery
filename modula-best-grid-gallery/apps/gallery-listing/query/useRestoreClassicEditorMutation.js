import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {{ id?: number }} item
 */
export async function postRestoreClassicEditor(item) {
	const id = Number(item?.id);
	return apiFetch({
		path: `/modula/v2/listing/${id}/restore-classic`,
		method: 'POST',
	});
}

/**
 * Restore classic editor from Convert backup via POST modula/v2/listing/{id}/restore-classic.
 */
export function useRestoreClassicEditorMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: postRestoreClassicEditor,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['modula-listing'] });
		},
	});
}
