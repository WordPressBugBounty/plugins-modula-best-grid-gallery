/**
 * Item link scheme guard (PHP `Item_Fields::sanitize_link()` parity).
 *
 * An item link becomes a tile href or a lightbox follow URL, so a `javascript:`
 * or `data:` link would run script on click. Links saved before the PHP save
 * cleaned them can still carry one.
 *
 * @package
 */

const SAFE_LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'];

// Browsers ignore control characters and spaces inside a URL scheme.
// eslint-disable-next-line no-control-regex
const IGNORED_URL_CHARS = /[\u0000- ]/g;

const URL_SCHEME = /^([^:/?#]+):/;

/**
 * @param {unknown} raw Item link, tile href or follow URL.
 * @return {string} The trimmed link when its scheme is safe or it is relative, else ''.
 */
export function safeItemLink(raw) {
	if (typeof raw !== 'string') {
		return '';
	}
	const link = raw.trim();
	const scheme = link.replace(IGNORED_URL_CHARS, '').match(URL_SCHEME);
	if (scheme && !SAFE_LINK_SCHEMES.includes(scheme[1].toLowerCase())) {
		return '';
	}
	return link;
}
