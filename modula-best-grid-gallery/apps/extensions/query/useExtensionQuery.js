import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

export const useExtensionQuery = () => {
	const extensions = useQuery({
		queryKey: ['extensions'],
		queryFn: async () => {
			const data = await apiFetch({
				path: `/modula-best-grid-gallery/v1/extensions`,
				method: 'GET',
			});
			return data;
		},
	});

	return extensions;
};
