/**
 * Copy for Lightbox click modes that are not Fancybox (direct / URL / no-link).
 * Shown under Image click behavior in the sidebar — not in the live preview.
 */
import { __ } from '@wordpress/i18n';

/** @type {ReadonlySet<string>} */
const SIMPLE_LINK_LIGHTBOX_MODES = new Set([
	'direct',
	'external-url',
	'attachment-page',
	'no-link',
	'',
]);

/**
 * @param {unknown} mode
 * @returns {string}
 */
export function normalizeLightboxClickMode(mode) {
	return String(mode ?? 'fancybox').trim();
}

/**
 * @param {unknown} mode
 * @returns {boolean}
 */
export function isSimpleLinkLightboxMode(mode) {
	return SIMPLE_LINK_LIGHTBOX_MODES.has(normalizeLightboxClickMode(mode));
}

/**
 * @param {string} mode
 * @returns {string}
 */
export function getSimpleLinkLightboxNoticeText(mode) {
	switch (mode) {
		case 'direct':
			return __(
				'Direct link: click a tile to open the full image file in the current tab.',
				'modula-best-grid-gallery'
			);
		case 'external-url':
			return __(
				'External URL: click a tile to open that image’s Link & display URL in the current tab.',
				'modula-best-grid-gallery'
			);
		case 'attachment-page':
			return __(
				'Attachment page: click a tile to open the attachment page (or custom URL) in the current tab.',
				'modula-best-grid-gallery'
			);
		case 'no-link':
		case '':
			return __(
				'No link: tiles do not open a lightbox. Per-image links in Link & display still apply when set.',
				'modula-best-grid-gallery'
			);
		default:
			return '';
	}
}

/**
 * Sidebar footnote when Image click behavior is a simple-link mode.
 *
 * @param {unknown} lightboxMode
 * @returns {string}
 */
export function getSimpleLinkLightboxSidebarFootnote(lightboxMode) {
	const mode = normalizeLightboxClickMode(lightboxMode);
	if (!isSimpleLinkLightboxMode(mode)) {
		return '';
	}
	return getSimpleLinkLightboxNoticeText(mode);
}
