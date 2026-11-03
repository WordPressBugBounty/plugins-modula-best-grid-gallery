/**
 * Embed popover rows for a gallery: Shortcode and PHP for the primary
 * `[modula id]` code, then the extra rows PHP provides through
 * `modula_admin_aditional_shortcodes_dropdown` (Pro: Modula Link, download
 * button, permalink).
 */
import { __ } from '@wordpress/i18n';
import { buildEmbedRows, isPhpEmbedRow } from 'editor-shell/logic';

// Gallery copy for known extra rows; other rows keep the label PHP sends.
const EXTRA_ROW_COPY = {
	modula_link: {
		label: __(
			'Modula Link (opens the gallery in a lightbox)',
			'modula-best-grid-gallery'
		),
		copyLabel: __('Copy Modula Link', 'modula-best-grid-gallery'),
	},
};

/**
 * @param {number}  galleryId
 * @param {unknown} phpRows   `galleryShortcodes.rows` from the editor config; the first is the primary shortcode.
 * @return {import('editor-shell/top-bar/TopBarEmbed').EmbedRow[]} Rows in display order; empty without a gallery.
 */
export function buildGalleryEmbedRows(galleryId, phpRows) {
	const id = Number(galleryId);
	if (!id) {
		return [];
	}

	const rows = (Array.isArray(phpRows) ? phpRows : []).filter(isPhpEmbedRow);

	return buildEmbedRows({
		// PHP sends the primary `[modula id]` row first.
		shortcode: rows[0]?.code || `[modula id="${id}"]`,
		copyShortcodeLabel: __(
			'Copy gallery shortcode',
			'modula-best-grid-gallery'
		),
		extraRows: rows.slice(1),
		extraRowCopy: EXTRA_ROW_COPY,
	});
}
