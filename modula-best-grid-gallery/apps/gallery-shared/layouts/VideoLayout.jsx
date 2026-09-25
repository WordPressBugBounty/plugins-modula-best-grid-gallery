/**
 * Modula Gallery - Video layout (main player + playlist).
 *
 * @package
 */

import { useMemo, useRef } from '@wordpress/element';
import { useSelector } from 'react-redux';
import usePlaylistDragScroll from '../hooks/usePlaylistDragScroll';
import { useVideoGalleryController } from '../hooks/useVideoGalleryController';
import VideoGalleryMainPlayer from '../video/VideoGalleryMainPlayer';
import VideoGalleryPlaylistItem from '../video/VideoGalleryPlaylistItem';
import { resolvePlaylistScrollbarChrome } from '../video/playlistScrollbarChrome';
import {
	normalizeVideoGalleryItems,
	resolvePlaylistPosition,
} from '../video/videoGalleryModel';
import VideoGalleryPreviewAdminMount from '../video/VideoGalleryPreviewAdminMount';

export default function VideoLayout() {
	const items = useSelector((state) => state.items.items);
	const config = useSelector((state) => state.gallery.config);
	const galleryId = config.galleryId || '0';
	const playlistItemsRef = useRef(null);

	const videos = useMemo(
		() => normalizeVideoGalleryItems(items, config),
		[items, config]
	);

	const {
		activeIndex,
		select,
		playNext,
		userHasInteracted,
		markUserInteracted,
	} = useVideoGalleryController(videos.length);

	const activeVideo = videos[activeIndex] || null;
	const playlistPosition = resolvePlaylistPosition(config);
	const { showScrollbar, dragEnabled } =
		resolvePlaylistScrollbarChrome(config);
	const wrapClass = `modula-video-player-wrap playlist_${playlistPosition}`;
	const playerId = `modula-video-player-${galleryId}`;
	const showPlaylist = videos.length > 1;
	const playlistItemsClass = [
		'modula-video-items',
		!showScrollbar ? 'modula-video-items--scrollbar-hidden' : '',
	]
		.filter(Boolean)
		.join(' ');

	usePlaylistDragScroll(playlistItemsRef, {
		enabled: showPlaylist && dragEnabled,
		axis: playlistPosition === 'bottom' ? 'x' : 'y',
	});

	if (!activeVideo) {
		return (
			<div className="modula-items modula-video modula-video--empty">
				<p className="modula-video-gallery__empty">
					No videos in this gallery.
				</p>
			</div>
		);
	}

	return (
		<div className="modula-items modula-video">
			<div className={wrapClass}>
				<div className="modula-video-main-item">
					<VideoGalleryMainPlayer
						key={`${playerId}-${activeIndex}-${activeVideo.playbackUrl}-${activeVideo.poster}`}
						video={activeVideo}
						playerId={playerId}
						config={config}
						onEnded={playNext}
						userHasInteracted={userHasInteracted}
						onUserInteract={markUserInteracted}
					/>
					{!showPlaylist ? (
						<VideoGalleryPreviewAdminMount
							itemData={activeVideo.item}
						/>
					) : null}
				</div>
				{showPlaylist ? (
					<div className="modula-video-items-wrap">
						<div
							ref={playlistItemsRef}
							className={playlistItemsClass}
						>
							{videos.map((video, index) => (
								<VideoGalleryPlaylistItem
									key={
										video.item.id ??
										video.item.embeddedId ??
										`${video.playbackUrl}-${video.poster}-${index}`
									}
									video={video}
									isActive={index === activeIndex}
									onSelect={() => {
										markUserInteracted();
										select(index);
									}}
									config={config}
								/>
							))}
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
