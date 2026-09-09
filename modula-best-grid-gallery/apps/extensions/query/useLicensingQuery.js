import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

export const useLicensingQuery = () => {
	const license = useQuery({
		queryKey: ['license'],
		queryFn: async () => {
			const data = await apiFetch({
				path: '/modula-best-grid-gallery/v1/license',
				method: 'POST',
				data: {
					action: 'check',
				},
			});
			return data;
		},
	});

	return license;
};
