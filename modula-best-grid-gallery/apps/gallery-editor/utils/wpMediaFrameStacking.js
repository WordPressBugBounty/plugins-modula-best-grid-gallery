/**
 * Toggle body class so `.modula-gallery-modal` yields to core `wp.media`
 * (see `_gallery-modal.scss` — media frame z-index is below our ~1M shell).
 */

export const WP_MEDIA_FRAME_BODY_CLASS = 'modula-wp-media-frame-open';

let wpMediaFrameOpenCount = 0;

export function markWpMediaFrameOpen() {
	if (typeof document === 'undefined') {
		return;
	}
	wpMediaFrameOpenCount += 1;
	document.body.classList.add(WP_MEDIA_FRAME_BODY_CLASS);
}

export function markWpMediaFrameClosed() {
	if (typeof document === 'undefined') {
		return;
	}
	wpMediaFrameOpenCount = Math.max(0, wpMediaFrameOpenCount - 1);
	if (wpMediaFrameOpenCount === 0) {
		document.body.classList.remove(WP_MEDIA_FRAME_BODY_CLASS);
	}
}

/**
 * Attach open/close markers so gallery builder modals hide while wp.media is up.
 *
 * @param {Object} frame wp.media frame instance.
 */
export function bindWpMediaFrameStacking(frame) {
	if (!frame || typeof frame.on !== 'function') {
		return;
	}
	frame.on('open', markWpMediaFrameOpen);
	frame.on('close', markWpMediaFrameClosed);
}
