import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * Whether Modula AI image descriptor settings (configured key + localhost gate).
 *
 * @param {{ enabled?: boolean }} [options]
 * @return {import('@tanstack/react-query').UseQueryResult<{
 *   aiConfigured: boolean,
 *   unavailableOnLocalhost: boolean,
 * }>}
 */
export function useModulaAiDescriptorSettingsQuery(options = {}) {
	const { enabled = true } = options;
	return useQuery({
		queryKey: ['modula-ai-image-descriptor', 'ai-settings'],
		enabled,
		queryFn: () =>
			apiFetch({
				path: '/modula-ai-image-descriptor/v1/ai-settings',
				method: 'GET',
			}),
		select: (r) => ({
			aiConfigured: Boolean(r?.readonly?.valid_key),
			unavailableOnLocalhost: Boolean(r?.unavailable_on_localhost),
		}),
	});
}
