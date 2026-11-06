/**
 * The lightbox image's alt: the item's own alt text, as plain text.
 *
 * @package
 */

/**
 * An image without alt text gets an empty alt, not its title or caption:
 * screen readers read the caption below the image already.
 *
 * @param {unknown} value The item's stored alt.
 * @return {string} Its text without markup, trimmed; '' when it has none.
 */
export function lightboxImageAlt(value) {
	if (typeof value !== 'string' || value.trim() === '') {
		return '';
	}
	// DOMParser is inert: the markup never runs or loads anything.
	const doc = new window.DOMParser().parseFromString(value, 'text/html');
	return (doc.body.textContent || '').trim();
}
