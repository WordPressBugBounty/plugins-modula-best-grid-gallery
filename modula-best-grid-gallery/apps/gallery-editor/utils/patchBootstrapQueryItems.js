/**
 * Merge preview item rows into the React Query bootstrap cache without refetching.
 *
 * @package
 */
import {
	applyVideoPosterFieldsToPreviewItem,
} from 'gallery-shared/preview';
import { getGalleryBootstrapQueryKey } from '../query/useGalleryBootstrapQuery';
import { cloneBootstrapItemsForPreviewStore } from './takeoverLivePreviewBootstrap';

/**
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {number}                                      galleryId
 * @param {unknown[]}                                   items
 * @param {Record<string, unknown>}                   [metadataPatch]
 */
export function patchBootstrapQueryItems(
	queryClient,
	galleryId,
	items,
	metadataPatch = {}
) {
	if (!galleryId || !queryClient) {
		return;
	}
	const key = getGalleryBootstrapQueryKey(galleryId);
	queryClient.setQueryData(key, (prev) => {
		if (!prev || typeof prev !== 'object') {
			return prev;
		}
		return {
			...prev,
			items: cloneBootstrapItemsForPreviewStore(
				(Array.isArray(items) ? items : []).map((row) =>
					applyVideoPosterFieldsToPreviewItem(row)
				)
			),
			metadata: {
				...(prev.metadata && typeof prev.metadata === 'object'
					? prev.metadata
					: {}),
				...metadataPatch,
			},
		};
	});
}
