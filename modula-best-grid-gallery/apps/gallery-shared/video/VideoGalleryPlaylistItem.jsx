/**
 * Video gallery playlist thumbnail tile.
 *
 * @package
 */

import VideoGalleryPlayIcon, {
	resolveVideoPlayIconAttachmentId,
	resolveVideoPlayIconCustomSrc,
} from './VideoGalleryPlayIcon';
import VideoGalleryPreviewAdminMount from './VideoGalleryPreviewAdminMount';

/**
 * @param {Object}   props
 * @param {Object}   props.video - Normalized video item
 * @param {boolean}  props.isActive
 * @param {Function} props.onSelect
 * @param {Object}   props.config
 */
export default function VideoGalleryPlaylistItem({
	video,
	isActive,
	onSelect,
	config,
}) {
	const videoSettings = config?.video || {};
	const showIcon = videoSettings.showVideoIcon !== false;
	const iconColor =
		typeof videoSettings.videoIconColor === 'string'
			? videoSettings.videoIconColor
			: '#FFF';
	const iconSize = Array.isArray(videoSettings.playIconSize)
		? Math.min(32, videoSettings.playIconSize[0] || 32)
		: 28;
	const customSrc = resolveVideoPlayIconCustomSrc(videoSettings);
	const customAttachmentId = resolveVideoPlayIconAttachmentId(videoSettings);
	const poster = video.poster;

	const classNames = ['modula-video-item'];
	if (isActive) {
		classNames.push('current-item');
	}

	return (
		<div className={classNames.join(' ')}>
			<div className="modula-item-content">
				<button
					type="button"
					className="modula-video-list-overlay"
					onClick={onSelect}
					aria-label={video.title || 'Select video'}
					aria-current={isActive ? 'true' : undefined}
				/>
				<div className="modula-video-gallery__thumb-frame">
					{poster ? (
						<img
							className="modula-video-gallery__thumb"
							src={poster}
							alt={video.title || ''}
							loading="lazy"
							decoding="async"
						/>
					) : (
						<div
							className="modula-video-gallery__thumb modula-video-gallery__thumb--empty"
							role="img"
							aria-hidden="true"
						/>
					)}
					{showIcon ? (
						<VideoGalleryPlayIcon
							color={iconColor}
							size={iconSize}
							customSrc={customSrc}
							attachmentId={customAttachmentId}
						/>
					) : null}
				</div>
				<VideoGalleryPreviewAdminMount itemData={video.item} />
			</div>
		</div>
	);
}
