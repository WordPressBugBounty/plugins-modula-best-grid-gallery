/**
 * Visitor edit gallery link (Beta shortcode). Classic emits the same via PHP.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useSelector } from 'react-redux';
import { isSettingsEditorPreview } from '../utils/displayContext';

/**
 * @return {import('react').JSX.Element|null}
 */
export default function VisitorEditGalleryLink() {
	const metadata = useSelector((state) => state.gallery.metadata || {});
	const editGalleryUrl =
		typeof metadata.editGalleryUrl === 'string'
			? metadata.editGalleryUrl.trim()
			: '';

	if (isSettingsEditorPreview(metadata) || editGalleryUrl === '') {
		return null;
	}

	return (
		<a className="post-edit-link" href={editGalleryUrl}>
			{__('Edit gallery', 'modula-best-grid-gallery')}
		</a>
	);
}
