import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/** Cache key of the extensions list; a saved change updates and refetches it. */
export const EXTENSIONS_QUERY_KEY = ['extensions'];

/**
 * The extension catalog grouped by plan, each extension with its state on
 * this site (`PlanGroup[]`, see model/extensionsPageModel.js).
 */
export const useExtensionsQuery = () =>
	useQuery({
		queryKey: EXTENSIONS_QUERY_KEY,
		retry: 1,
		queryFn: () =>
			apiFetch({
				path: '/modula-best-grid-gallery/v1/extensions',
				method: 'GET',
			}),
	});
