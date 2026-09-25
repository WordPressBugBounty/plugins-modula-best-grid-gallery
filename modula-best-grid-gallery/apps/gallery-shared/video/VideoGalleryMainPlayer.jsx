/**
 * Video gallery main player (YouTube API, Vimeo SDK, HTML5).
 *
 * @package
 */

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { loadYouTubeIframeApi } from './loadYouTubeIframeApi';
import { loadVimeoPlayerApi } from './loadVimeoPlayerApi';
import { destroyVideoGalleryPlayer } from './destroyVideoGalleryPlayer';
import {
	getVideoGalleryPlayerRemountInputs,
	playVideoGalleryPlayer,
	resolveVideoGalleryStartMuted,
	shouldAdvancePlaylistOnVideoEnd,
} from './videoGalleryPlayerControls';
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
	const userHasInteractedRef = useRef(!!userHasInteracted);
	const onEndedRef = useRef(onEnded);
	const [showPoster, setShowPoster] = useState(
		() => !video?.autoplayThumbnail
	);

	userHasInteractedRef.current = !!userHasInteracted;
	onEndedRef.current = onEnded;

	const remountInputs = getVideoGalleryPlayerRemountInputs(video);

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
		playVideoGalleryPlayer({
			kind: video?.kind,
			player: playerRef.current,
			html5El: html5Ref.current,
		});
	}, [onUserInteract, video?.kind]);

	useEffect(() => {
		setShowPoster(!video?.autoplayThumbnail);
	}, [video?.playbackUrl, video?.autoplayThumbnail, video?.poster]);

	// First gesture during muted autoplay: unmute in place (do not remount).
	useEffect(() => {
		if (!userHasInteracted || !video?.autoplayThumbnail) {
			return;
		}
		playVideoGalleryPlayer({
			kind: video?.kind,
			player: playerRef.current,
			html5El: html5Ref.current,
		});
		// Only when the interaction flag flips — item changes remount separately.
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
	}, [userHasInteracted]);

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
			const loop = !!video.loopVideos;
			const notifyEnded = () => {
				if (!shouldAdvancePlaylistOnVideoEnd(loop)) {
					return;
				}
				if (typeof onEndedRef.current === 'function') {
					onEndedRef.current();
				}
			};
			const startMuted = () =>
				resolveVideoGalleryStartMuted(
					autoplay,
					userHasInteractedRef.current
				);

			if (video.kind === 'youtube' && video.youtubeId) {
				const YT = await loadYouTubeIframeApi();
				if (cancelled) {
					return;
				}
				const muted = startMuted();
				const playerVars = {
					autoplay: autoplay ? 1 : 0,
					mute: muted ? 1 : 0,
					playsinline: 1,
					rel: 0,
				};
				if (loop) {
					playerVars.loop = 1;
					playerVars.playlist = video.youtubeId;
				}
				playerRef.current = new YT.Player(mountEl, {
					videoId: video.youtubeId,
					width: '100%',
					height: '100%',
					playerVars,
					events: {
						onReady(event) {
							if (cancelled) {
								return;
							}
							playerRef.current = event.target;
							if (
								startMuted() &&
								typeof event.target.mute === 'function'
							) {
								event.target.mute();
							} else if (
								autoplay &&
								userHasInteractedRef.current
							) {
								playVideoGalleryPlayer({
									kind: 'youtube',
									player: event.target,
								});
							}
							if (autoplay) {
								event.target.playVideo();
								setShowPoster(false);
							}
						},
						onStateChange(event) {
							if (event.data !== YT.PlayerState.ENDED) {
								return;
							}
							if (!shouldAdvancePlaylistOnVideoEnd(loop)) {
								if (
									typeof event.target.seekTo === 'function'
								) {
									event.target.seekTo(0);
								}
								if (
									typeof event.target.playVideo ===
									'function'
								) {
									event.target.playVideo();
								}
								return;
							}
							notifyEnded();
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
				const muted = startMuted();
				playerRef.current = new Vimeo.Player(mountEl, {
					id: video.vimeoId,
					width: '100%',
					height: '100%',
					autoplay,
					muted,
					loop,
					autopause: false,
				});
				vimeoEndedHandlerRef.current = () => {
					notifyEnded();
				};
				playerRef.current.on('ended', vimeoEndedHandlerRef.current);
				if (autoplay) {
					setShowPoster(false);
					if (userHasInteractedRef.current) {
						playVideoGalleryPlayer({
							kind: 'vimeo',
							player: playerRef.current,
						});
					}
				}
				return;
			}

			const muted = startMuted();
			const videoEl = document.createElement('video');
			videoEl.className = 'modula-video-gallery__html5';
			videoEl.controls = true;
			videoEl.playsInline = true;
			videoEl.preload = 'metadata';
			videoEl.loop = loop;
			if (video.poster) {
				videoEl.poster = video.poster;
			}
			if (muted) {
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
				notifyEnded();
			});
			mountEl.appendChild(videoEl);
			html5Ref.current = videoEl;
			playerRef.current = videoEl;
			if (autoplay) {
				if (userHasInteractedRef.current) {
					playVideoGalleryPlayer({
						kind: 'html5',
						html5El: videoEl,
					});
				} else {
					const p = videoEl.play?.();
					if (p && typeof p.catch === 'function') {
						p.catch(() => {});
					}
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
		// Remount only when the active item / autoplay mode changes — not on
		// userHasInteracted (that would cancel poster-click play intent).
		// eslint-disable-next-line react-hooks/exhaustive-deps -- remountInputs
	}, [
		remountInputs.playbackUrl,
		remountInputs.youtubeId,
		remountInputs.vimeoId,
		remountInputs.kind,
		remountInputs.autoplayThumbnail,
		remountInputs.loopVideos,
		remountInputs.poster,
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
								icon={videoSettings.videoIconIcon}
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
