import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';
import { useCallback } from '@wordpress/element';

export const useLicensingMutation = () => {
	const queryClient = useQueryClient();

	const mutationFn = useCallback((vars) => {
		return apiFetch({
			path: `/modula-best-grid-gallery/v1/license`,
			method: 'POST',
			data: {
				license_key: vars.licenseKey,
				action: vars.action,
			},
		});
	}, []);

	const licensingMutation = useMutation({
		mutationFn,
		onSuccess: () => {
			queryClient.invalidateQueries({
				refetchType: 'all',
				queryKey: ['license'],
			});
			queryClient.invalidateQueries({
				refetchType: 'all',
				queryKey: ['extensions'],
			});
		},
	});

	return licensingMutation;
};
