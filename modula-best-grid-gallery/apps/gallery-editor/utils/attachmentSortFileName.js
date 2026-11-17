/**
 * The name a gallery item is sorted by in the File name sort modes: the
 * uploaded file's name without its folder and extension.
 */

/** WordPress stores a large image as `<name>-scaled.<ext>` and keeps the upload as `original_image`. */
const SCALED_SUFFIX = /-scaled$/;

/**
 * @param {string} path A file path or URL.
 * @return {string} Its last segment, without a query string or fragment.
 */
function baseName(path) {
	return path.split(/[?#]/)[0].split('/').pop() || '';
}

/**
 * @param {string} name A file's base name.
 * @return {string} The name without its extension; a name that is only an extension is kept.
 */
function withoutExtension(name) {
	return name.replace(/(?!^)\.[^.]+$/, '');
}

/**
 * @param {unknown} value
 * @return {string} `value` trimmed when it is a string, else ''.
 */
function textOrEmpty(value) {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * A duplicate suffix (`-1`, `-2`) is kept: it cannot be told apart from a name
 * that ends in a number.
 *
 * @param {Record<string, unknown>|null|undefined} mediaRow A `/wp/v2/media` row.
 * @return {string} The file name to sort by, or '' when the row has no file.
 */
export function attachmentSortFileName(mediaRow) {
	const details =
		mediaRow?.media_details && typeof mediaRow.media_details === 'object'
			? mediaRow.media_details
			: {};
	// The upload's own name: nothing to remove but the extension.
	const original = textOrEmpty(details.original_image);
	if (original) {
		return withoutExtension(baseName(original));
	}
	const stored =
		textOrEmpty(details.file) || textOrEmpty(mediaRow?.source_url);
	return withoutExtension(baseName(stored)).replace(SCALED_SUFFIX, '');
}
