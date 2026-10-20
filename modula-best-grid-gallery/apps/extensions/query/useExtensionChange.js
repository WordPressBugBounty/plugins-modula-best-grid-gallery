import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { applyChange } from '../model/extensionChanges';
import { EXTENSIONS_QUERY_KEY } from './useExtensionsQuery';

/**
 * Saves an `ExtensionChange` through Compatible Pro's bulk toggle route,
 * for a single switch too: it sets each extension to the requested state,
 * where the single route flips it, so a page showing a stale state cannot
 * turn an extension the wrong way (for Password Protect, without the
 * confirmation).
 *
 * @param {import('../model/extensionChanges').ExtensionChange} change
 * @return {Promise<void>} Rejects unless Pro confirms the save.
 */
async function saveChange(change) {
	const response = await apiFetch({
		path: '/modula-pro/v1/extensions',
		method: 'POST',
		data: { extensions: change.slugs, status: change.status },
	});

	if (true !== response?.success) {
		throw new Error('Modula Pro did not confirm the extension change.');
	}
}

/**
 * Mutation for one extension change. On success the list shows the new
 * state at once; after any outcome the list is refetched, so the server's
 * state wins, also after a failure.
 */
export const useExtensionChange = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: saveChange,
		onSuccess: (_saved, change) => {
			queryClient.setQueryData(EXTENSIONS_QUERY_KEY, (groups) =>
				groups ? applyChange(groups, change) : groups
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: EXTENSIONS_QUERY_KEY });
		},
	});
};
