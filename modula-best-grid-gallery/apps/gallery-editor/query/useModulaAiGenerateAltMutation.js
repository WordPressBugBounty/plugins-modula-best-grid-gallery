import { useMutation } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

/**
 * @param {number} attachmentId
 */
export function modulaAiGenerateAltRequest(attachmentId) {
	return apiFetch({
		path: '/modula-ai-image-descriptor/v1/generate-alt-text/',
		method: 'POST',
		data: {
			id: 'single',
			attachment_id: attachmentId,
			action: 'generate',
		},
	});
}

/**
 * @return {import('@tanstack/react-query').UseMutationResult}
 */
export function useModulaAiGenerateAltMutation() {
	return useMutation({
		mutationFn: (attachmentId) => modulaAiGenerateAltRequest(attachmentId),
	});
}
