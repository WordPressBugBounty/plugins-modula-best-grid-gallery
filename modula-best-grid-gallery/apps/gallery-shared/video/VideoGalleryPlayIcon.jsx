/**
 * Default / custom play icon overlay for video tiles and VideoLayout.
 *
 * @package
 */

import { useWpAttachmentSourceUrl } from '../hooks/useWpAttachmentSourceUrl';
import {
	VIDEO_PLAY_ICON_VIEWBOX,
	resolveVideoPlayIconPresetPath,
} from './videoPlayIconResolve';

export {
	resolveVideoPlayIconAttachmentId,
	resolveVideoPlayIconCustomSrc,
	resolveVideoPlayIconPresetPath,
} from './videoPlayIconResolve';

/**
 * @param {Object} props
 * @param {string} [props.color]
 * @param {number} [props.size]
 * @param {string} [props.icon] video.videoIconIcon preset key
 * @param {string} [props.customSrc] Custom icon image URL.
 * @param {number|string} [props.attachmentId] Fallback when URL is not enriched yet (editor).
 */
export default function VideoGalleryPlayIcon({
	color = '#FFF',
	size = 48,
	icon = 'default',
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
	const path = resolveVideoPlayIconPresetPath(icon);
	return (
		<svg
			className="modula-video-icon"
			width={dim}
			height={dim}
			viewBox={VIDEO_PLAY_ICON_VIEWBOX}
			aria-hidden="true"
			focusable="false"
		>
			<path fill={color} d={path} />
		</svg>
	);
}
