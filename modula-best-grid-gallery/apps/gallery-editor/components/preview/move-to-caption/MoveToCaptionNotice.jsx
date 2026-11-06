/**
 * Inline notice above the gallery editor canvas: images whose caption is still only
 * in the Media Library Description, with a one-click move into the Caption.
 */
import { useMutation } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
import { galleryUploadPost } from '../../../api/galleryUploadApi';
import { useInvalidateGalleryBootstrap } from '../../../hooks/useInvalidateGalleryBootstrap';
import { describeMoveToCaptionNotice } from './describeMoveToCaptionNotice';

/**
 * @param {{ galleryId: number, captionsToMove?: number }} props
 */
export default function MoveToCaptionNotice({ galleryId, captionsToMove }) {
	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);
	const move = useMutation({
		mutationFn: () => galleryUploadPost(galleryId, 'move-to-caption'),
		// The refreshed bootstrap carries the remaining count; 0 hides the notice.
		onSuccess: invalidateBootstrap,
	});

	const notice = describeMoveToCaptionNotice(captionsToMove, move.data);
	if (!notice) {
		return null;
	}

	return (
		<AdminUiScope>
			<Notice
				className="modula-gallery-takeover__move-to-caption-notice"
				role="status"
			>
				<p>{notice.message}</p>
				{notice.skippedMessages.map((line) => (
					<p key={line}>{line}</p>
				))}
				{move.isError ? (
					<p role="alert">
						{__(
							"Couldn't move the captions. Try again.",
							'modula-best-grid-gallery'
						)}
					</p>
				) : null}
				<Button
					className="modula-gallery-takeover__move-to-caption-button"
					disabled={move.isPending}
					onClick={() => move.mutate()}
				>
					{__('Move to Caption', 'modula-best-grid-gallery')}
				</Button>
			</Notice>
		</AdminUiScope>
	);
}
