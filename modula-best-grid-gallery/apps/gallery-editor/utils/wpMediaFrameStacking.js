/**
 * Toggle a body class while core `wp.media` is open, so `useModalEscapeKey`
 * overlays leave Escape to the media frame.
 */

import { WP_MEDIA_FRAME_BODY_CLASS } from 'editor-shell';

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
 * Attach the open/close markers to a wp.media frame.
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
