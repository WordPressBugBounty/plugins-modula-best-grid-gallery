/**
 * Layout debug mode: `?modula_layout_debug=1` on the page URL makes the row
 * layouts (Justified, Creative Mosaic) paint coloured blocks instead of images,
 * so the computed rows can be checked in the browser.
 *
 * @package
 */

const ROW_DEBUG_COLORS = [
	'#4a90d9',
	'#7ed321',
	'#bd10e0',
	'#f5a623',
	'#50e3c2',
	'#d0021b',
];

/**
 * @param {number} rowIndex
 * @return {string} A colour that repeats every six rows.
 */
export function getLayoutDebugColor(rowIndex) {
	return ROW_DEBUG_COLORS[rowIndex % ROW_DEBUG_COLORS.length] ?? '#999';
}

/**
 * @return {boolean} Whether the page asked for layout debug blocks.
 */
export function isLayoutDebugMode() {
	if (typeof window === 'undefined') {
		return false;
	}
	return (
		new URLSearchParams(window.location.search).get(
			'modula_layout_debug'
		) === '1'
	);
}
