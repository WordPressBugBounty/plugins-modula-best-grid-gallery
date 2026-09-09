import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

export const useInsightsQuery = () => {
	return useQuery({
		queryKey: ['insights'],
		queryFn: async () => {
			const data = await apiFetch({
				path: `/modula-best-grid-gallery/v1/insights`,
				method: 'GET',
			});
			return data;
		},
	});
};
