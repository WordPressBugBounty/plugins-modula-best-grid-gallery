/**
 * Normalize gallery alignment and resolve root margin CSS.
 * Block/shortcode `align*` wins when set to a real WP placement (WordPress theme
 * classes handle placement). Blank / `none` leave gallery alignment in charge.
 *
 * @param {unknown} raw Alignment from general.alignment / config.alignment.
 * @param {{ blockAlign?: unknown }} [opts]
 * @return {string} Margin declarations (no braces), or empty when block align wins.
 */
export function resolveGalleryAlignmentCss(raw, opts = {}) {
	if (isBlockAlignOverride(opts.blockAlign)) {
		return '';
	}

	const alignment = normalizeGalleryAlignment(raw);

	if (alignment === 'left') {
		return 'margin-left:0!important;margin-right:auto!important;';
	}
	if (alignment === 'right') {
		return 'margin-left:auto!important;margin-right:0!important;';
	}
	return 'margin-left:auto!important;margin-right:auto!important;';
}

/**
 * @param {unknown} raw
 * @return {boolean}
 */
export function isBlockAlignOverride(raw) {
	const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
	if (!s || s === 'none') {
		return false;
	}
	return (
		s === 'left' ||
		s === 'center' ||
		s === 'right' ||
		s === 'wide' ||
		s === 'full'
	);
}

/**
 * @param {unknown} raw
 * @return {'left'|'center'|'right'}
 */
export function normalizeGalleryAlignment(raw) {
	const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
	if (s === 'left' || s === 'center' || s === 'right') {
		return s;
	}
	return 'center';
}
