import { useMutation } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {number} attachmentId
 * @param {'generate'|'refresh'} [action]
 */
export function modulaAiGenerateTitleRequest(attachmentId, action = 'generate') {
	return apiFetch({
		path: '/modula-ai-image-descriptor/v1/generate-alt-text/',
		method: 'POST',
		data: {
			id: 'single',
			attachment_id: attachmentId,
			action,
		},
	});
}

/**
 * @return {import('@tanstack/react-query').UseMutationResult}
 */
export function useModulaAiGenerateTitleMutation() {
	return useMutation({
		mutationFn: ({ attachmentId, action = 'generate' }) =>
			modulaAiGenerateTitleRequest(attachmentId, action),
	});
}
