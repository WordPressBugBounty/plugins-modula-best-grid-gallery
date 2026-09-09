/**
 * Muted hover / autoplay thumbnail preview for mixed-gallery video tiles.
 *
 * @package
 */

import { useEffect, useRef, useState } from '@wordpress/element';
import { isSettingsEditorPreview } from '../utils/displayContext';
import {
	classifyVideoKind,
	extractVimeoVideoId,
	extractYouTubeVideoId,
	formatVideoPlaybackUrl,
	getItemVideoUrl,
	resolveItemAutoplayThumbnail,
} from '../video/videoGalleryModel';

/**
 * @param {Object} props
 * @param {Object} props.itemData
 * @param {Object} props.config
 * @param {Object} [props.metadata]
 */
export default function GalleryItemVideoPreview({
	itemData,
	config,
	metadata,
}) {
	const videoSettings = config?.video || {};
	const previewOn = !!videoSettings.previewVideo;
	const autoplayThumb = resolveItemAutoplayThumbnail(
		itemData,
		!!videoSettings.autoplayThumbnail
	);
	const durationSec = Math.max(
		1,
		Math.min(30, Number(videoSettings.previewVideoDuration) || 3)
	);
	const playbackUrl = getItemVideoUrl(itemData);
	const kind = classifyVideoKind(playbackUrl);
	const skipEditor = isSettingsEditorPreview(metadata);

	const [active, setActive] = useState(!!autoplayThumb && !skipEditor);
	const wrapRef = useRef(null);
	const videoRef = useRef(null);
	const hoverTimer = useRef(null);
	const loopTimer = useRef(null);

	useEffect(() => {
		if (skipEditor || (!previewOn && !autoplayThumb) || !playbackUrl) {
			return undefined;
		}
		if (kind !== 'html5') {
			return undefined;
		}
		const el = videoRef.current;
		if (!el || !active) {
			return undefined;
		}
		el.muted = true;
		el.playsInline = true;
		const play = el.play();
		if (play && typeof play.catch === 'function') {
			play.catch(() => {});
		}
		if (previewOn && !autoplayThumb) {
			loopTimer.current = window.setInterval(() => {
				try {
					el.currentTime = 0;
					el.play()?.catch?.(() => {});
				} catch {
					// ignore
				}
			}, durationSec * 1000);
		}
		return () => {
			if (loopTimer.current) {
				window.clearInterval(loopTimer.current);
				loopTimer.current = null;
			}
			try {
				el.pause();
				el.currentTime = 0;
			} catch {
				// ignore
			}
		};
	}, [
		active,
		autoplayThumb,
		durationSec,
		kind,
		playbackUrl,
		previewOn,
		skipEditor,
	]);

	useEffect(() => {
		return () => {
			if (hoverTimer.current) {
				window.clearTimeout(hoverTimer.current);
			}
			if (loopTimer.current) {
				window.clearInterval(loopTimer.current);
			}
		};
	}, []);

	if (
		skipEditor ||
		config?.type === 'video' ||
		(!previewOn && !autoplayThumb) ||
		!playbackUrl
	) {
		return null;
	}

	const onEnter = () => {
		if (autoplayThumb || !previewOn) {
			return;
		}
		hoverTimer.current = window.setTimeout(() => setActive(true), 200);
	};
	const onLeave = () => {
		if (autoplayThumb) {
			return;
		}
		if (hoverTimer.current) {
			window.clearTimeout(hoverTimer.current);
			hoverTimer.current = null;
		}
		setActive(false);
	};

	const previewSrc = formatVideoPlaybackUrl(playbackUrl, {
		autoplay: true,
		loop: true,
		mute: true,
	});

	return (
		<div
			ref={wrapRef}
			className={`modula-video-tile-preview${
				active ? ' is-active' : ''
			}${autoplayThumb ? ' is-autoplay' : ''}`}
			onMouseEnter={onEnter}
			onMouseLeave={onLeave}
			aria-hidden="true"
		>
			{active && kind === 'html5' ? (
				<video
					ref={videoRef}
					className="modula-video-tile-preview__media"
					src={playbackUrl}
					muted
					playsInline
					loop={!!autoplayThumb}
				/>
			) : null}
			{active && kind === 'youtube' ? (
				<iframe
					className="modula-video-tile-preview__media"
					src={previewSrc}
					title=""
					allow="autoplay; encrypted-media"
					tabIndex={-1}
				/>
			) : null}
			{active && kind === 'vimeo' && extractVimeoVideoId(playbackUrl) ? (
				<iframe
					className="modula-video-tile-preview__media"
					src={previewSrc}
					title=""
					allow="autoplay; encrypted-media"
					tabIndex={-1}
				/>
			) : null}
		</div>
	);
}
