/**
 * Story slide: inline video (HTML5, YouTube, Vimeo). Poster/caption match image stories.
 *
 * @package
 */

import { useEffect, useRef } from '@wordpress/element';
import { mergeReactClassNameProps } from '../utils/attributeUtils';
import {
	buildStoryVideoEmbedUrl,
	classifyStoryVideoKind,
} from '../utils/storyVideo';

/**
 * @param {Object}   props
 * @param {Object}   props.vm - View model (shell classes, link, attrs)
 * @param {Object}   props.itemData
 * @param {boolean}  props.isActive - Current carousel slide
 * @param {Function} [props.onPlaybackEnded] - After HTML5 ended or iframe fallback timeout
 * @param {number}   props.iframeFallbackMs - Max time on iframe slide before auto-advance
 * @param {import('react').ReactNode} [props.children] - e.g. caption
 * @param {import('react').ReactNode} [props.previewAdminToolbar] - Settings-editor hover actions
 */
export default function StoryVideoSlide({
	vm,
	itemData,
	isActive,
	onPlaybackEnded,
	iframeFallbackMs,
	children = null,
	previewAdminToolbar = null,
}) {
	const {
		item,
		style,
		itemAttrs,
		itemClasses,
		linkAttrs,
		linkHref,
		showLink,
		linkClasses,
		imageSrc,
	} = vm;

	const playbackUrl = (
		(itemData.videoUrl && String(itemData.videoUrl).trim()) ||
		(itemData.video_url && String(itemData.video_url).trim()) ||
		(itemData.videoSrc && String(itemData.videoSrc).trim()) ||
		''
	).trim();

	const kind =
		classifyStoryVideoKind(playbackUrl) ||
		(playbackUrl ? 'html5' : null);
	const poster = imageSrc || itemData.thumbnail || itemData.src || '';
	const videoRef = useRef(null);

	/** HTML5: play/pause with slide visibility */
	useEffect(() => {
		const el = videoRef.current;
		if (!el || kind !== 'html5') {
			return undefined;
		}
		if (isActive) {
			const p = el.play?.();
			if (p && typeof p.catch === 'function') {
				p.catch(() => {});
			}
		} else {
			el.pause?.();
			el.currentTime = 0;
		}
		return undefined;
	}, [isActive, kind]);

	/** HTML5: advance when clip ends */
	useEffect(() => {
		const el = videoRef.current;
		if (!el || kind !== 'html5' || !isActive || !onPlaybackEnded) {
			return undefined;
		}
		const onEnd = () => onPlaybackEnded();
		el.addEventListener('ended', onEnd);
		return () => el.removeEventListener('ended', onEnd);
	}, [kind, isActive, onPlaybackEnded]);

	/** YouTube/Vimeo: no reliable ended event without host APIs — timeout fallback */
	useEffect(() => {
		if (
			!isActive ||
			(kind !== 'youtube' && kind !== 'vimeo') ||
			!onPlaybackEnded
		) {
			return undefined;
		}
		const ms = Math.max(10000, iframeFallbackMs);
		const t = window.setTimeout(onPlaybackEnded, ms);
		return () => window.clearTimeout(t);
	}, [isActive, kind, iframeFallbackMs, onPlaybackEnded]);

	const isCarouselSlide = itemClasses.includes('f-carousel__slide');

	let media = null;
	if (kind === 'youtube' || kind === 'vimeo') {
		const src = isActive
			? buildStoryVideoEmbedUrl(playbackUrl, kind)
			: '';
		media = src ? (
			<iframe
				key={`${item.id}-${kind}-active`}
				className="modula-story-video-iframe"
				src={src}
				title={item.title ? String(item.title) : ''}
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
				allowFullScreen
			/>
		) : (
			poster && (
				<img
					className="modula-story-video-poster"
					src={poster}
					alt={item.alt || ''}
					decoding="async"
				/>
			)
		);
	} else if (kind === 'html5') {
		media = (
			<video
				ref={videoRef}
				className="modula-story-video-el"
				src={playbackUrl}
				poster={poster || undefined}
				playsInline
				muted
				preload="metadata"
			/>
		);
	}

	return (
		<div
			{...itemAttrs}
			style={{
				position: 'relative',
				...(isCarouselSlide ? {} : { width: '100%' }),
				...style,
			}}
		>
			{showLink && (
				// eslint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/anchor-has-content
				<a
					{...mergeReactClassNameProps(linkAttrs, linkClasses)}
					href={linkHref || '#'}
				/>
			)}
			<div className="modula-story-image-wrapper modula-story-video-wrapper">
				{media}
				{children}
			</div>
			{previewAdminToolbar ? (
				<div className="modula-item-preview-admin-mount">
					<div className="modula-item-preview-admin-mount__inner">
						{previewAdminToolbar}
					</div>
				</div>
			) : null}
			<div
				className="modula-item-overlay"
				style={{ position: 'absolute', inset: 0 }}
				aria-hidden="true"
			/>
			<div
				className="modula-item-content"
				style={{ position: 'absolute', inset: 0 }}
			/>
		</div>
	);
}
