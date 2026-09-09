import { useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * Whether Modula AI image descriptor has a valid API key (readonly flag from REST).
 *
 * @param {{ enabled?: boolean }} [options]
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
		select: (r) => Boolean(r?.readonly?.valid_key),
	});
}
