import { useSyncExternalStore } from '@wordpress/element';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';

/** Stable snapshot when bulk edit is closed or preview items are not ready yet. */
const EMPTY_PREVIEW_ITEMS = [];

/**
 * Subscribe to live preview Redux `items.items` without a react-redux Provider
 * (bulk modal renders at takeover shell level, outside preview `<Provider>`).
 *
 * @param {boolean} [enabled=true]
 * @return {Object[]}
 */
export function usePreviewReduxStoreItems(enabled = true) {
	const store = getGalleryPreviewReduxStore();

	return useSyncExternalStore(
		(onStoreChange) => {
			if (!enabled || !store) {
				return () => {};
			}
			return store.subscribe(onStoreChange);
		},
		() => {
			if (!enabled || !store) {
				return EMPTY_PREVIEW_ITEMS;
			}
			const items = store.getState().items?.items;
			return items ?? EMPTY_PREVIEW_ITEMS;
		},
		() => {
			if (!enabled || !store) {
				return EMPTY_PREVIEW_ITEMS;
			}
			const items = store.getState().items?.items;
			return items ?? EMPTY_PREVIEW_ITEMS;
		}
	);
}
