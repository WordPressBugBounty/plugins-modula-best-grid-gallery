/**
 * Client-side sanitizing of caption HTML (image descriptions, lightbox captions).
 *
 * @package
 */

import DOMPurify from 'dompurify';

// `target` keeps "open in new tab" links; the SVG tags and attributes keep
// icon markup the lightbox caption may carry.
const CAPTION_SANITIZE_CONFIG = {
	ADD_TAGS: ['svg', 'path'],
	ADD_ATTR: ['target', 'viewBox', 'xmlns', 'width', 'height', 'fill', 'd'],
};

/**
 * Saved descriptions already went through `wp_kses_post`; the editor canvas
 * renders unsaved ones before the server sees them, so captions rendered as
 * HTML go through this first.
 *
 * @param {unknown} html Caption HTML.
 * @return {string} The HTML without script, event handlers or unsafe URLs.
 */
export function sanitizeCaptionHtml(html) {
	return DOMPurify.sanitize(String(html ?? ''), CAPTION_SANITIZE_CONFIG);
}
