/**
 * Warn when title/caption use below-image placement — hover builder preview cannot show them.
 */
import { useState } from '@wordpress/element';
import { Notice } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { shouldShowHoverBuilderBelowImageNotice } from '../../utils/editorCaptionsAreBelowImage';

const DISMISS_SESSION_KEY = 'modulaHoverBuilderBelowImageNoticeDismissed';

/**
 * @return {boolean}
 */
function readDismissedFromSession() {
	try {
		return window.sessionStorage?.getItem(DISMISS_SESSION_KEY) === '1';
	} catch {
		return false;
	}
}

/**
 * @param {Object} props
 * @param {Object|null|undefined} props.captions Grouped captions settings.
 * @param {string|null|undefined} props.galleryType Gallery layout type.
 * @param {string} [props.className]
 * @param {boolean} [props.compact] Shorter copy for the narrow aux column.
 */
export default function HoverBuilderBelowImageNotice({
	captions,
	galleryType,
	className = '',
	compact = false,
}) {
	const [dismissed, setDismissed] = useState(readDismissedFromSession);

	if (
		dismissed ||
		!shouldShowHoverBuilderBelowImageNotice(captions, galleryType)
	) {
		return null;
	}

	const message = compact
		? __(
				'Title and caption are below the image, so only card hover (overlay, zoom, frame) applies here. Set Captions → Content placement to Inside image to style text on hover.',
				'modula-best-grid-gallery'
			)
		: __(
				'Title and caption are set to display below the image, so they will not appear in this hover preview. Only card-level hover effects (overlay, zoom, frame, and similar) are shown here. To design hover effects for title and caption text, open Captions and set Content placement to Inside image.',
				'modula-best-grid-gallery'
			);

	return (
		<Notice
			status="warning"
			isDismissible
			className={[
				'modula-gallery-takeover__hover-builder-below-image-notice',
				compact
					? 'modula-gallery-takeover__hover-builder-below-image-notice--compact'
					: '',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			onRemove={() => {
				setDismissed(true);
				try {
					window.sessionStorage?.setItem(DISMISS_SESSION_KEY, '1');
				} catch {
					/* ignore quota / private mode */
				}
			}}
		>
			{message}
		</Notice>
	);
}
