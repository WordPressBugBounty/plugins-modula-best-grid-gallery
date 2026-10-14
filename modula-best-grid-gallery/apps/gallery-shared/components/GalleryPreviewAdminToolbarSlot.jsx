/**
 * Settings-editor preview toolbar slot (lazy-loaded; omitted on visitor galleries).
 *
 * @package
 */

import { lazy, Suspense } from '@wordpress/element';
import { useSelector } from 'react-redux';

const LazyGalleryPreviewItemAdminToolbar = lazy(
	() => import('./GalleryPreviewItemAdminToolbar')
);

/**
 * @param {Object} props
 * @param {Object} props.itemData     Raw item passed to GalleryItem / SliderItem.
 * @param          props.catalogIndex
 */
export default function GalleryPreviewAdminToolbarSlot({
	itemData,
	catalogIndex,
}) {
	const isEditorPreviewChrome = useSelector(
		(s) =>
			s.gallery.metadata?.displayContext === 'settings-editor-preview' ||
			s.gallery.metadata?.staticStoryLayout === true
	);

	if (!isEditorPreviewChrome) {
		return null;
	}

	return (
		<Suspense fallback={null}>
			<LazyGalleryPreviewItemAdminToolbar
				itemData={itemData}
				catalogIndex={catalogIndex}
			/>
		</Suspense>
	);
}
