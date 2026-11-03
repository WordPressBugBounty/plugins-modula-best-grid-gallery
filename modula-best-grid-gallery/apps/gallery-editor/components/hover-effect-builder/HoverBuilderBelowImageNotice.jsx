/**
 * Warn when title/caption use below-image placement — hover builder preview cannot show them.
 */
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, Notice } from 'admin-ui';
import { AdminUiScope } from 'editor-shell';
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
 * @param {Object}                props
 * @param {Object|null|undefined} props.captions    Grouped captions settings.
 * @param {string|null|undefined} props.galleryType Gallery layout type.
 * @param {string}                [props.className]
 * @param {boolean}               [props.compact]   Shorter copy for the narrow aux column.
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

	const dismiss = () => {
		setDismissed(true);
		try {
			window.sessionStorage?.setItem(DISMISS_SESSION_KEY, '1');
		} catch {
			/* ignore quota / private mode */
		}
	};

	// The canvas copy renders outside any admin-ui scope; in the builder
	// column the scope is already there and this adds nothing.
	return (
		<AdminUiScope>
			{/* `status`: announced when it appears, as WP's Notice did. */}
			<Notice
				tone="warning"
				role="status"
				className={[
					'modula-gallery-takeover__hover-builder-below-image-notice',
					className,
				]
					.filter(Boolean)
					.join(' ')}
			>
				<p className="modula-gallery-takeover__hover-builder-below-image-notice-text">
					{message}
				</p>
				<Button variant="link" onClick={dismiss}>
					{__('Dismiss', 'modula-best-grid-gallery')}
				</Button>
			</Notice>
		</AdminUiScope>
	);
}
