import { __ } from '@wordpress/i18n';
import { CanvasEmptyState } from 'editor-shell';
import GalleryTakeoverPreviewUploadDropZone from './GalleryTakeoverPreviewUploadDropZone';

/**
 * Centered empty state shown when the gallery has nothing to paint yet.
 *
 * @param {{
 *   galleryType?: string,
 *   status?: 'idle'|'loading'|'complete',
 *   uploadCurrent?: number,
 *   uploadTotal?: number,
 *   interactive?: boolean,
 *   onFilesSelected?: (files: FileList | File[]) => void,
 * }} props
 */
export default function GalleryTakeoverPreviewEmptyState({
	galleryType = '',
	status = 'idle',
	uploadCurrent,
	uploadTotal,
	interactive = false,
	onFilesSelected,
}) {
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
		<CanvasEmptyState>
			<GalleryTakeoverPreviewUploadDropZone
				placement="empty"
				status={status}
				uploadCurrent={uploadCurrent}
				uploadTotal={uploadTotal}
				interactive={interactive}
				onFilesSelected={onFilesSelected}
				idleCaption={__(
					'Drop images here to start your gallery.',
					'modula-best-grid-gallery'
				)}
				completeCaption={__(
					'Images added to your gallery.',
					'modula-best-grid-gallery'
				)}
				regionLabel={__(
					'Empty gallery drop zone',
					'modula-best-grid-gallery'
				)}
			/>
		</CanvasEmptyState>
	);
}
