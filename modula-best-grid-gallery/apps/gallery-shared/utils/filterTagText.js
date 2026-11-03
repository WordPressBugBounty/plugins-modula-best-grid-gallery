/**
 * An item's `filters` text: filter names joined by commas, a comma inside a
 * name written `&#44;`, as the PHP helpers `modula_gallery_filter_list_*`
 * read and write it. The visitor reads the text with these; the editors'
 * filter tag rules (editor-shell `filterTags`) read and write it.
 *
 * @package
 */

const ENCODED_COMMA = '&#44;';

/**
 * @param {string} name A filter name.
 * @return {string} The name as it is written in an item's `filters` text.
 */
export function encodeFilterTag(name) {
	return String(name).split(',').join(ENCODED_COMMA);
}

/**
 * @param {string} tag A name as an item's `filters` text writes it.
 * @return {string} The filter name.
 */
function decodeFilterTag(tag) {
	return String(tag).split(ENCODED_COMMA).join(',');
}

/**
 * @param {string} text An item's `filters` text.
 * @return {string[]} Its trimmed, non-empty filter names.
 */
export function parseFilterTagText(text) {
	return String(text)
		.split(',')
		.map((part) => decodeFilterTag(part).trim())
		.filter(Boolean);
}
