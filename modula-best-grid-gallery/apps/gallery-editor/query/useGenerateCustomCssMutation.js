import { useMutation } from '@tanstack/react-query';
import { generateGalleryCustomCssRequest } from '../api/galleryCssAiRest';

/**
 * @param {number} galleryId
 * @return {import('@tanstack/react-query').UseMutationResult}
 */
export function useGenerateCustomCssMutation(galleryId) {
	return useMutation({
		mutationFn: (userPrompt) =>
			generateGalleryCustomCssRequest(galleryId, userPrompt),
	});
}
