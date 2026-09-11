import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { addQueryArgs } from '@wordpress/url';
import { listingRowRestPath } from '../listingRowRestPath';

/**
 * @param {'trash'|'restore'|'delete'} action
 * @param {Object} item
 * @return {Promise<unknown>}
 */
function mutateListingRow(action, item) {
	const path = listingRowRestPath(item);
	if (action === 'trash') {
		return apiFetch({ path, method: 'DELETE' });
	}
	if (action === 'delete') {
		return apiFetch({
			path: addQueryArgs(path, { force: true }),
			method: 'DELETE',
		});
	}
	const status =
		typeof item?.restoreStatus === 'string' && item.restoreStatus
			? item.restoreStatus
			: 'draft';
	return apiFetch({
		path,
		method: 'PUT',
		data: { status },
	});
}

/**
 * Trash, restore, or permanently delete listing rows via WP CPT REST.
 */
export function useListingRowLifecycleMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ action, items }) => {
			const rows = Array.isArray(items) ? items : [];
			await Promise.all(
				rows.map((item) => mutateListingRow(action, item))
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['modula-listing'] });
			queryClient.invalidateQueries({
				queryKey: ['modula-listing-row-preview'],
			});
		},
	});
}
