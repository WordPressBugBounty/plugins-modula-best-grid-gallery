import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';
import { useGalleryBootstrapQuery } from '../query/useGalleryBootstrapQuery';
import { resolveGalleryAdminPostId } from '../utils/resolveGalleryAdminPostId';

/**
 * Images in the saved gallery, from the takeover bootstrap.
 *
 * @return {{ isKnown: boolean, count: number }} Whether the count is loaded, and the count.
 */
export function useGalleryImageCount() {
	const config = useModulaSettingsEditorConfig();
	const galleryId = resolveGalleryAdminPostId(config);
	const { data: bootstrap } = useGalleryBootstrapQuery(galleryId);

	if (!Array.isArray(bootstrap?.items)) {
		return { isKnown: false, count: 0 };
	}

	return { isKnown: true, count: bootstrap.items.length };
}
