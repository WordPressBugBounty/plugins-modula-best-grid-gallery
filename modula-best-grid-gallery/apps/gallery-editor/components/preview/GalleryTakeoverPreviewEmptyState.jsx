import { __ } from '@wordpress/i18n';
import { CanvasEmptyState } from 'editor-shell';

/**
 * Centered empty state shown when the gallery has nothing to paint yet:
 * "No images yet" with an "Add images" button (the toolbar's primary Add).
 *
 * @param {{ galleryType?: string }} props
 */
export default function GalleryTakeoverPreviewEmptyState({ galleryType = '' }) {
	if (galleryType === 'video') {
		return (
			<CanvasEmptyState
				message={__(
					'No videos in this gallery yet.',
					'modula-best-grid-gallery'
				)}
				hint={__(
					'Use Add New → Video to import a clip or playlist.',
					'modula-best-grid-gallery'
				)}
			/>
		);
	}

	return (
		<CanvasEmptyState
			message={__('No images yet', 'modula-best-grid-gallery')}
			actionLabel={__('Add images', 'modula-best-grid-gallery')}
		/>
	);
}
