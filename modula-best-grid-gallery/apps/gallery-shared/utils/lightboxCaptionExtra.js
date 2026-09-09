/**
 * Generic lightbox caption append for Pro extensions (opaque HTML).
 * Lite does not interpret EXIF/licensing/etc. — only concatenates when present.
 *
 * @package
 */

/**
 * True when caption HTML has no visible text (empty Pro title/description wrappers
 * still create a padded `.f-caption` and pin the image to the top of the slide).
 *
 * @param {unknown} html
 * @returns {boolean}
 */
export function lightboxCaptionHasVisibleText(html) {
	const raw = typeof html === 'string' ? html.trim() : '';
	if (!raw) {
		return false;
	}
	if (typeof document === 'undefined') {
		return raw.replace(/<[^>]*>/g, '').trim() !== '';
	}
	const el = document.createElement('div');
	el.innerHTML = raw;
	return (el.textContent || '').trim() !== '';
}

/**
 * @param {unknown} html
 * @returns {string}
 */
export function normalizeLightboxCaptionHtml(html) {
	if (!lightboxCaptionHasVisibleText(html)) {
		return '';
	}
	return typeof html === 'string' ? html : '';
}

/**
 * @param {string} caption Base caption HTML/text.
 * @param {string} extraHtml Opaque HTML fragment from an extension.
 * @returns {string}
 */
export function mergeLightboxCaptionWithExtra(caption, extraHtml) {
	const base = typeof caption === 'string' ? caption : '';
	const extra = typeof extraHtml === 'string' ? extraHtml.trim() : '';
	if (!extra) {
		return base;
	}
	if (!base) {
		return extra;
	}
	return base + extra;
}

/**
 * @param {unknown} row Gallery item / bootstrap row.
 * @returns {string}
 */
export function resolveCaptionExtraHtmlFromRow(row) {
	if (!row || typeof row !== 'object') {
		return '';
	}
	const raw = row.captionExtraHtml;
	return typeof raw === 'string' ? raw : '';
}
