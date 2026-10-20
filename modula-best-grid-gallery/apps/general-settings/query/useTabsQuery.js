import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * The key stays `settings-tabs-query`: field actions refetch it.
 */
export const TABS_QUERY_KEY = ['settings-tabs-query'];

/**
 * Settings groups → sections → cards (`shape=groups` of the tabs route).
 */
export const useTabsQuery = () => {
	const settings = useQuery({
		queryKey: TABS_QUERY_KEY,
		retry: 1,
		queryFn: async () => {
			const data = await apiFetch({
				path: `/modula-best-grid-gallery/v1/general-settings-tabs?shape=groups`,
				method: 'GET',
			});

			return data;
		},
	});

	return settings;
};
