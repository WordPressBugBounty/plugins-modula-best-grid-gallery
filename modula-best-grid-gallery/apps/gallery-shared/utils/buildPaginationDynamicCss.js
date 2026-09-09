/**
 * Dynamic CSS for pagination controls (colors from grouped v2 settings).
 *
 * @package
 */

/**
 * @param {unknown} value Color field value (hex string or ColorPicker object).
 * @return {string}
 */
function resolveCssColorValue(value) {
	if (typeof value === 'string' && value.trim() !== '') {
		return value.trim();
	}
	if (
		value &&
		typeof value === 'object' &&
		typeof value.hex === 'string' &&
		value.hex.trim() !== ''
	) {
		return value.hex.trim();
	}
	return '';
}

/**
 * @param {string} rootSelector Gallery root selector (e.g. `#modula-123`).
 * @param {Object} paginationSettings Grouped `settings.pagination`.
 * @return {string} CSS rules or empty string.
 */
export function buildPaginationDynamicCss(
	rootSelector,
	paginationSettings = {}
) {
	const root = typeof rootSelector === 'string' ? rootSelector.trim() : '';
	if (!root) {
		return '';
	}

	const paginationColor = resolveCssColorValue(
		paginationSettings.paginationColor
	);
	const activePaginationColor = resolveCssColorValue(
		paginationSettings.activePaginationColor
	);

	let css = '';
	const controlSel = `${root}.modula-gallery .modula-pagination button,${root}.modula-gallery .modula-pagination__load-more`;

	if (paginationColor) {
		css += `${controlSel}{color:${paginationColor} !important;border-color:${paginationColor} !important;}`;
	}
	if (activePaginationColor) {
		css +=
			`${root}.modula-gallery .modula-pagination button.active,` +
			`${root}.modula-gallery .modula-pagination button:hover{color:${activePaginationColor} !important;border-color:${activePaginationColor} !important;}`;
	}

	return css;
}
