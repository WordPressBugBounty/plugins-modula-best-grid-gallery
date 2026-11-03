/**
 * Takeover Filters category: gallery-shared's Filters preview, the static bar
 * over a "Gallery" block, its chips counting the gallery's images.
 * The live preview mounts it only once the gallery has filter names.
 */
import { __ } from '@wordpress/i18n';
import { FiltersPreviewPanel as SharedFiltersPreviewPanel } from 'gallery-shared/preview';
import { usePreviewReduxStoreItems } from '../../../hooks/usePreviewReduxStoreItems';

/**
 * @param {{
 *   galleryId: number,
 *   groupedSettings: object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 * }} props
 */
export default function FiltersPreviewPanel({
	galleryId,
	groupedSettings,
	previewViewport,
}) {
	const previewItems = usePreviewReduxStoreItems(true);

	return (
		<SharedFiltersPreviewPanel
			rootId={galleryId}
			groupedSettings={groupedSettings}
			previewViewport={previewViewport}
			items={previewItems}
			contentLabel={__('Gallery', 'modula-best-grid-gallery')}
		/>
	);
}
