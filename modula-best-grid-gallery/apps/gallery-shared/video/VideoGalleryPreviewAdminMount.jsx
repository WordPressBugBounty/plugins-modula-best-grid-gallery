/**
 * Settings-editor live preview: Edit / Delete mount for video layout tiles.
 *
 * @package
 */

import { useSelector } from 'react-redux';
import GalleryPreviewAdminToolbarSlot from '../components/GalleryPreviewAdminToolbarSlot';

/**
 * @param {Object} props
 * @param {Object} props.itemData Raw gallery row for toolbar lookup.
 */
export default function VideoGalleryPreviewAdminMount({ itemData }) {
	const isEditorPreview = useSelector(
		(state) =>
			state.gallery.metadata?.displayContext ===
				'settings-editor-preview' ||
			state.gallery.metadata?.staticStoryLayout === true
	);

	if (!isEditorPreview) {
		return null;
	}

	return (
		<div className="modula-item-preview-admin-mount">
			<div className="modula-item-preview-admin-mount__inner">
				<GalleryPreviewAdminToolbarSlot itemData={itemData} />
			</div>
		</div>
	);
}
