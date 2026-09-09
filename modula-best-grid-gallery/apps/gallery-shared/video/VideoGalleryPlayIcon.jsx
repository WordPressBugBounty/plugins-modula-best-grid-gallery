/**
 * Default / custom play icon overlay for video tiles and VideoLayout.
 *
 * @package
 */

import { useWpAttachmentSourceUrl } from '../hooks/useWpAttachmentSourceUrl';

/**
 * @param {Object} props
 * @param {string} [props.color]
 * @param {number} [props.size]
 * @param {string} [props.customSrc] Custom icon image URL.
 * @param {number|string} [props.attachmentId] Fallback when URL is not enriched yet (editor).
 */
export default function VideoGalleryPlayIcon({
	color = '#FFF',
	size = 48,
	customSrc = '',
	attachmentId = 0,
}) {
	const dim = Math.max(24, size);
	const explicit = typeof customSrc === 'string' ? customSrc.trim() : '';
	const fetched = useWpAttachmentSourceUrl(explicit ? 0 : attachmentId);
	const src = explicit || fetched;
	if (src) {
		return (
			<img
				className="modula-video-icon modula-video-icon--custom"
				src={src}
				alt=""
				width={dim}
				height={dim}
				aria-hidden="true"
				draggable={false}
			/>
		);
	}
	return (
		<svg
			className="modula-video-icon"
			width={dim}
			height={dim}
			viewBox="0 0 64 64"
			aria-hidden="true"
			focusable="false"
		>
			<circle cx="32" cy="32" r="30" fill="rgba(0,0,0,0.45)" />
			<path d="M26 20 L46 32 L26 44 Z" fill={color} />
		</svg>
	);
}

/**
 * Resolve custom play-icon URL from config.video.
 *
 * @param {Object|null|undefined} videoSettings
 * @return {string}
 */
export function resolveVideoPlayIconCustomSrc(videoSettings) {
	if (!videoSettings?.useCustomIcon) {
		return '';
	}
	if (
		typeof videoSettings.customVideoIconUrl === 'string' &&
		videoSettings.customVideoIconUrl.trim() !== ''
	) {
		return videoSettings.customVideoIconUrl.trim();
	}
	const raw = videoSettings.customVideoIcon;
	if (typeof raw === 'string' && /^https?:\/\//i.test(raw.trim())) {
		return raw.trim();
	}
	return '';
}

/**
 * Attachment ID for custom play icon when useCustomIcon is on.
 *
 * @param {Object|null|undefined} videoSettings
 * @return {number}
 */
export function resolveVideoPlayIconAttachmentId(videoSettings) {
	if (!videoSettings?.useCustomIcon) {
		return 0;
	}
	const id = parseInt(videoSettings.customVideoIcon, 10);
	return Number.isFinite(id) && id > 0 ? id : 0;
}
