/**
 * Video gallery main player (YouTube API, Vimeo SDK, HTML5).
 *
 * @package
 */

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { loadYouTubeIframeApi } from './loadYouTubeIframeApi';
import { loadVimeoPlayerApi } from './loadVimeoPlayerApi';
import { destroyVideoGalleryPlayer } from './destroyVideoGalleryPlayer';
import VideoGalleryPlayIcon, {
	resolveVideoPlayIconAttachmentId,
	resolveVideoPlayIconCustomSrc,
} from './VideoGalleryPlayIcon';

/**
 * @param {Object}   props
 * @param {Object}   props.video - Normalized video item
 * @param {string}   props.playerId - Unique DOM id for player mount
 * @param {Object}   props.config
 * @param {Function} props.onEnded
 * @param {boolean}  props.userHasInteracted
 * @param {Function} props.onUserInteract
 */
export default function VideoGalleryMainPlayer({
	video,
	playerId,
	config,
	onEnded,
	userHasInteracted,
	onUserInteract,
}) {
	const mountRef = useRef(null);
	const playerRef = useRef(null);
	const html5Ref = useRef(null);
	const vimeoEndedHandlerRef = useRef(null);
	const [showPoster, setShowPoster] = useState(
		() => !video?.autoplayThumbnail
	);

	const videoSettings = config?.video || {};
	const showIcon = videoSettings.showVideoIcon !== false;
	const iconColor =
		typeof videoSettings.videoIconColor === 'string'
			? videoSettings.videoIconColor
			: '#FFF';
	const iconSize = Array.isArray(videoSettings.playIconSize)
		? videoSettings.playIconSize[0] || 48
		: 48;
	const customSrc = resolveVideoPlayIconCustomSrc(videoSettings);
	const customAttachmentId = resolveVideoPlayIconAttachmentId(videoSettings);

	const hidePosterAndPlay = useCallback(() => {
		onUserInteract?.();
		setShowPoster(false);
		const player = playerRef.current;
		if (!player || !video) {
			return;
		}
		if (
			video.kind === 'youtube' &&
			typeof player.playVideo === 'function'
		) {
			if (typeof player.unMute === 'function') {
				player.unMute();
			}
			player.playVideo();
		} else if (
			video.kind === 'vimeo' &&
			typeof player.play === 'function'
		) {
			if (typeof player.setMuted === 'function') {
				player.setMuted(false);
			}
			player.play();
		} else if (html5Ref.current) {
			html5Ref.current.muted = false;
			const p = html5Ref.current.play?.();
			if (p && typeof p.catch === 'function') {
				p.catch(() => {});
			}
		}
	}, [onUserInteract, video]);

	useEffect(() => {
		setShowPoster(!video?.autoplayThumbnail);
	}, [video?.playbackUrl, video?.autoplayThumbnail, video?.poster]);

	useEffect(() => {
		const mountEl = mountRef.current;
		if (!mountEl || !video) {
			return undefined;
		}

		let cancelled = false;
		mountEl.innerHTML = '';
		html5Ref.current = null;

		async function mountPlayer() {
			await destroyVideoGalleryPlayer(playerRef);
			if (cancelled) {
				return;
			}

			const autoplay = !!video.autoplayThumbnail;
			const startMuted = autoplay && !userHasInteracted;

			if (video.kind === 'youtube' && video.youtubeId) {
				const YT = await loadYouTubeIframeApi();
				if (cancelled) {
					return;
				}
				playerRef.current = new YT.Player(mountEl, {
					videoId: video.youtubeId,
					width: '100%',
					height: '100%',
					playerVars: {
						autoplay: autoplay ? 1 : 0,
						mute: startMuted ? 1 : 0,
						playsinline: 1,
						rel: 0,
					},
					events: {
						onReady(event) {
							if (cancelled) {
								return;
							}
							if (
								startMuted &&
								typeof event.target.mute === 'function'
							) {
								event.target.mute();
							}
							if (autoplay) {
								event.target.playVideo();
								setShowPoster(false);
							}
						},
						onStateChange(event) {
							if (
								event.data === YT.PlayerState.ENDED &&
								typeof onEnded === 'function'
							) {
								onEnded();
							}
						},
					},
				});
				return;
			}

			if (video.kind === 'vimeo' && video.vimeoId) {
				const Vimeo = await loadVimeoPlayerApi();
				if (cancelled) {
					return;
				}
				playerRef.current = new Vimeo.Player(mountEl, {
					id: video.vimeoId,
					width: '100%',
					height: '100%',
					autoplay,
					muted: startMuted,
					autopause: false,
				});
				vimeoEndedHandlerRef.current = () => {
					if (typeof onEnded === 'function') {
						onEnded();
					}
				};
				playerRef.current.on('ended', vimeoEndedHandlerRef.current);
				if (autoplay) {
					setShowPoster(false);
				}
				return;
			}

			const videoEl = document.createElement('video');
			videoEl.className = 'modula-video-gallery__html5';
			videoEl.controls = true;
			videoEl.playsInline = true;
			videoEl.preload = 'metadata';
			if (video.poster) {
				videoEl.poster = video.poster;
			}
			if (startMuted) {
				videoEl.muted = true;
			}
			if (autoplay) {
				videoEl.autoplay = true;
			}
			const source = document.createElement('source');
			source.src = video.playbackUrl;
			source.type = 'video/mp4';
			videoEl.appendChild(source);
			videoEl.addEventListener('ended', () => {
				if (typeof onEnded === 'function') {
					onEnded();
				}
			});
			mountEl.appendChild(videoEl);
			html5Ref.current = videoEl;
			playerRef.current = videoEl;
			if (autoplay) {
				const p = videoEl.play?.();
				if (p && typeof p.catch === 'function') {
					p.catch(() => {});
				}
				setShowPoster(false);
			}
		}

		mountPlayer().catch(() => {});

		return () => {
			cancelled = true;
			const player = playerRef.current;
			if (player?.off && vimeoEndedHandlerRef.current) {
				player.off('ended', vimeoEndedHandlerRef.current);
			}
			vimeoEndedHandlerRef.current = null;
			destroyVideoGalleryPlayer(playerRef);
			if (mountEl) {
				mountEl.innerHTML = '';
			}
			html5Ref.current = null;
		};
	}, [
		video?.playbackUrl,
		video?.youtubeId,
		video?.vimeoId,
		video?.kind,
		video?.autoplayThumbnail,
		video?.poster,
		userHasInteracted,
		onEnded,
	]);

	const posterVisible = showPoster && video?.poster;

	return (
		<div className="modula-video-main-item-content">
			<div className="modula-video-main-item-aspect">
				<div
					id={playerId}
					className="modula-video-gallery__player-mount"
					ref={mountRef}
				/>
				{posterVisible ? (
					<button
						type="button"
						className="modula-video-gallery__poster-btn"
						onClick={hidePosterAndPlay}
						aria-label={video.title || 'Play video'}
					>
						<img
							className="modula_video_preview_image"
							src={video.poster}
							alt={video.title || ''}
							loading="lazy"
							decoding="async"
						/>
						{showIcon ? (
							<VideoGalleryPlayIcon
								color={iconColor}
								size={iconSize}
								customSrc={customSrc}
								attachmentId={customAttachmentId}
							/>
						) : null}
					</button>
				) : null}
			</div>
		</div>
	);
}
