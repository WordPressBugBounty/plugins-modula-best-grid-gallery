/**
 * Sanitized HTML for Story slide captions (links + basic inline/block markup).
 *
 * @package
 */

import { Markup } from 'interweave';

/** @type {string[]} */
const STORY_CAPTION_ALLOWLIST = ['a', 'b', 'br', 'em', 'i', 'p', 'strong'];

/** @type {Record<string, string[]>} */
const STORY_CAPTION_ALLOWED_ATTRS = {
	a: ['href', 'title', 'target', 'rel'],
};

/**
 * @param {Object}  props
 * @param {string}  props.html       Caption HTML from WP / modula-images.
 * @param {string}  [props.className]
 */
export default function StoryCaptionRichText({ html, className = '' }) {
	const content = String(html || '').trim();
	if (!content) {
		return null;
	}

	return (
		<Markup
			className={className}
			content={content}
			allowList={STORY_CAPTION_ALLOWLIST}
			allowAttributes={STORY_CAPTION_ALLOWED_ATTRS}
			newWindow
		/>
	);
}
