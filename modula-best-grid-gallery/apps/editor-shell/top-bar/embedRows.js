/**
 * Embed popover rows, as the gallery and Albums editors build them:
 * Shortcode and PHP for the document's shortcode, then the extra rows PHP
 * sends through `modula_admin_aditional_shortcodes_dropdown` (Pro: Modula
 * Link, download button, standalone permalink).
 */
import { __, sprintf } from '@wordpress/i18n';

// Copy for extra rows every editor words the same way.
const SHARED_EXTRA_ROW_COPY = {
	standalone_permalink: {
		copyLabel: __('Copy URL', 'modula-best-grid-gallery'),
	},
};

/**
 * Editor copy for one extra row; a missing field keeps the PHP label or the
 * "Copy <label>" default.
 *
 * @typedef {Object} ExtraRowCopy
 * @property {string} [label]     Visible row label.
 * @property {string} [copyLabel] Accessible name of the Copy button.
 */

/**
 * @param {unknown} row
 * @return {boolean} Whether a PHP row has the id and code an embed row needs.
 */
export function isPhpEmbedRow(row) {
	return (
		typeof row?.id === 'string' &&
		row.id !== '' &&
		typeof row.code === 'string' &&
		row.code !== ''
	);
}

/**
 * @param {{ id: string, label: string, code: string }} row     Extra PHP row.
 * @param {Object<string, ExtraRowCopy>}                rowCopy Copy by row id.
 * @return {import('./TopBarEmbed').EmbedRow} Embed row with the editor's copy.
 */
function toEmbedRow(row, rowCopy) {
	const copy = rowCopy[row.id] || {};
	const label = copy.label || row.label;

	return {
		id: row.id,
		label,
		code: row.code,
		copyLabel:
			copy.copyLabel ||
			sprintf(
				/* translators: %s: embed row label (e.g. Download button) */
				__('Copy %s', 'modula-best-grid-gallery'),
				label
			),
	};
}

/**
 * @param {Object}                       input
 * @param {string}                       input.shortcode          The document's shortcode; empty before it exists.
 * @param {string}                       input.copyShortcodeLabel Accessible name of the shortcode's Copy button.
 * @param {unknown}                      [input.extraRows]        Extra PHP rows (id, label, code), in display order.
 * @param {Object<string, ExtraRowCopy>} [input.extraRowCopy]     The editor's copy for its own extra rows.
 * @return {import('./TopBarEmbed').EmbedRow[]} Rows in display order; empty without a shortcode.
 */
export function buildEmbedRows({
	shortcode,
	copyShortcodeLabel,
	extraRows = [],
	extraRowCopy = {},
}) {
	if (typeof shortcode !== 'string' || shortcode === '') {
		return [];
	}

	// The shortcode sits in a single-quoted PHP string.
	const phpShortcode = shortcode.replace(/[\\']/g, '\\$&');
	const rowCopy = { ...SHARED_EXTRA_ROW_COPY, ...extraRowCopy };
	const extras = Array.isArray(extraRows)
		? extraRows.filter(isPhpEmbedRow)
		: [];

	return [
		{
			id: 'shortcode',
			label: __('Shortcode', 'modula-best-grid-gallery'),
			code: shortcode,
			copyLabel: copyShortcodeLabel,
		},
		{
			id: 'php',
			label: __('PHP (theme templates)', 'modula-best-grid-gallery'),
			code: `<?php echo do_shortcode( '${phpShortcode}' ); ?>`,
			copyLabel: __('Copy PHP code', 'modula-best-grid-gallery'),
		},
		...extras.map((row) => toEmbedRow(row, rowCopy)),
	];
}
