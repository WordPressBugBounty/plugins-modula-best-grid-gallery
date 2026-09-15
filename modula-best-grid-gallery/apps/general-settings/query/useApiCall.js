import apiFetch from '@wordpress/api-fetch';
import { useQueryClient } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';

export const useApiCall = () => {
	const queryClient = useQueryClient();

	const doApiCall = async (
		path,
		method,
		data = false,
		options = {}
	) => {
		try {
			const request = {
				path,
				method,
			};

			if (method && method.toUpperCase() !== 'GET' && data) {
				request.data = { ...data };
			}

			const response = await apiFetch(request);

			await queryClient.invalidateQueries({
				queryKey: ['settings-tabs-query'],
			});

			if (options.download && (!response || response.body == null)) {
				throw new Error(
					__(
						'Modula Debug Log download payload was missing.',
						'modula-best-grid-gallery'
					)
				);
			}

			return response;
		} catch (error) {
			console.error('Error on api call:', error);
			throw error;
		}
	};

	return doApiCall;
};
