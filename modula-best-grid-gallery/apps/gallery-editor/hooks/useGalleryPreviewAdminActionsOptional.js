/**
 * Read preview admin actions from the module ref (outside preview Provider).
 */
import { useSyncExternalStore } from '@wordpress/element';
import { getGalleryPreviewAdminActions } from '../utils/previewAdminActionsRef';

/** @type {Set<() => void>} */
const listeners = new Set();

/**
 * Notify sidebar subscribers when live preview publishes admin actions.
 */
export function notifyPreviewAdminActionsListeners() {
	listeners.forEach((l) => l());
}

/**
 * @return {import('gallery-shared/context/GalleryPreviewAdminActionsContext').GalleryPreviewAdminActionsValue|null}
 */
export function useGalleryPreviewAdminActionsOptional() {
	return useSyncExternalStore(
		(onStoreChange) => {
			listeners.add(onStoreChange);
			return () => {
				listeners.delete(onStoreChange);
			};
		},
		() => getGalleryPreviewAdminActions(),
		() => getGalleryPreviewAdminActions()
	);
}
