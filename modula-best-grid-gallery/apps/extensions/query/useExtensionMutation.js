import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { useCallback } from '@wordpress/element';

export const useExtensionMutation = () => {
	const queryClient = useQueryClient();

	const mutationFn = useCallback((vars) => {
		return apiFetch({
			path: `/modula-pro/v1/extension`,
			method: 'POST',
			data: {
				extension: vars.extension,
			},
		});
	}, []);

	const extensionMutation = useMutation({
		mutationFn,
		onSuccess: () => {
			queryClient.invalidateQueries({
				refetchType: 'all',
				queryKey: ['extensions'],
			});
		},
	});

	return extensionMutation;
};
