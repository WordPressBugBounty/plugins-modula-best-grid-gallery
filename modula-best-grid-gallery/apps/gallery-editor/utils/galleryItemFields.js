/**
 * Per-image fields stored on the gallery item (CONTEXT.md "Gallery item"),
 * named once for the image edit panel, the item autosave, Bulk edit and the
 * preview merge. PHP names the same keys in `Modula\V2\Images\Item_Fields`.
 */

/** Hover Effect Builder preset id for this image; '' follows the gallery. */
export const ITEM_HOVER_PRESET_KEY = 'hover_preset';

/** Space-separated CSS classes added to the item's element on the frontend. */
export const ITEM_CSS_CLASS_KEY = 'css_class';

// A class token as PHP keeps it (`Item_Fields::sanitize_css_class`): letters,
// digits, `-` and `_`, not starting with a digit or `-` plus a digit.
const CSS_CLASS_TOKEN = /^-?[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * @param {unknown} raw Stored or typed value: classes separated by spaces or commas.
 * @return {string[]} Valid class tokens, in order, without duplicates.
 */
export function parseItemCssClasses(raw) {
	if (typeof raw !== 'string') {
		return [];
	}
	const tokens = raw
		.split(/[\s,]+/)
		.filter((token) => CSS_CLASS_TOKEN.test(token));
	return [...new Set(tokens)];
}

/**
 * @param {unknown} raw
 * @return {string} The stored form: valid tokens joined by single spaces.
 */
export function sanitizeItemCssClass(raw) {
	return parseItemCssClasses(raw).join(' ');
}
