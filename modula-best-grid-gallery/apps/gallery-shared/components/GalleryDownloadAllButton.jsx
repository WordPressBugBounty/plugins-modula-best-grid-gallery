/**
 * Gallery-level “Download all” control (Pro download extension parity for React mounts).
 *
 * @package
 */
import { useSelector } from 'react-redux';
import { isSettingsEditorPreview } from '../utils/displayContext';
import { shouldShowDownloadAllGalleryButton } from '../utils/downloadAllButton';
import DownloadAllButton from './DownloadAllButton';

/**
 * @param {{ placement: 'above'|'below' }} props
 * @return {import('react').JSX.Element|null} The button, or null while it is off.
 */
export default function GalleryDownloadAllButton({ placement }) {
	const settings = useSelector((state) => state.gallery.settings || {});
	const metadata = useSelector((state) => state.gallery.metadata || {});
	const galleryId = useSelector(
		(state) => state.gallery.galleryId || state.gallery.config?.galleryId
	);

	if (!shouldShowDownloadAllGalleryButton(settings)) {
		return null;
	}

	return (
		<DownloadAllButton
			download={settings.download || {}}
			placement={placement}
			galleryId={galleryId}
			editorPreview={isSettingsEditorPreview(metadata)}
		/>
	);
}
