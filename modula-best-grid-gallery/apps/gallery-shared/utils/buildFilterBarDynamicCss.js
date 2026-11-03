/**
 * Dynamic filter bar CSS (colors + alignment from gallery settings).
 *
 * @package
 */

function safeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function safeColor(value) {
	return safeString(value);
}

/**
 * @param {string} align The "Alignment" setting (`filterTextAlignment`).
 * @return {string} Its flex value, or '' for Inherit.
 */
export function flexAlignValue(align) {
	switch (align) {
		case 'center':
			return 'center';
		case 'right':
			return 'flex-end';
		case 'left':
			return 'flex-start';
		default:
			return '';
	}
}

/**
 * @param {string} positioning The "Position" setting (`filterPositioning`).
 * @return {boolean} Whether the bar stands beside the content.
 */
function isVerticalFilterLayout(positioning) {
	return ['left', 'right', 'left_right'].includes(positioning || 'top');
}

/**
 * @param {string} root           Gallery root selector (e.g. `#modula-123`).
 * @param {Object} groupedFilters `settings.filters`
 * @param {Object} config         Derived flat config.
 * @return {string} The bar's alignment and colour rules, or '' when none is set.
 */
export function buildFilterBarDynamicCss(root, groupedFilters, config) {
	let css = '';
	const filterTextAlignment =
		safeString(groupedFilters?.filterTextAlignment) ||
		safeString(config?.filterTextAlignment) ||
		safeString(config?.filterAlign);
	const filterPositioning =
		safeString(groupedFilters?.filterPositioning) ||
		safeString(config?.filterPositioning) ||
		safeString(config?.filterPosition) ||
		'top';
	const filterLinkColor =
		safeColor(groupedFilters?.filterLinkColor) ||
		safeColor(config?.filterLinkColor) ||
		safeColor(config?.filterColor);
	const filterLinkHoverColor =
		safeColor(groupedFilters?.filterLinkHoverColor) ||
		safeColor(config?.filterLinkHoverColor) ||
		safeColor(config?.filterActiveColor);

	const alignValue = flexAlignValue(filterTextAlignment);
	if (alignValue) {
		const listSel = `${root}.modula-gallery .filters .modula_menu__list`;
		const verticalListSel = [
			`${root}.modula-gallery .modula-gallery-filter-layout--left > .filters .modula_menu__list`,
			`${root}.modula-gallery .modula-gallery-filter-layout--right > .filters .modula_menu__list`,
			`${root}.modula-gallery .modula-gallery-filter-layout--left-right > .filters .modula_menu__list`,
		].join(',');

		if (isVerticalFilterLayout(filterPositioning)) {
			css += `${verticalListSel}{width:100%;align-items:${alignValue};}`;
			css +=
				'@media screen and (max-width:782px){' +
				`${verticalListSel}{width:100%;justify-content:${alignValue};align-items:center;}` +
				'}';
		} else {
			css += `${listSel}{width:100%;justify-content:${alignValue};}`;
		}
	}

	// The chips by their class: the visitor's are links, the Filters tab's
	// static ones spans (Lite ticket 99). Hover stays on the visitor's links,
	// as nothing in the static bar responds.
	if (filterLinkColor) {
		css += `${root}.modula-gallery .filters .modula_menu__link{color:${filterLinkColor} !important;}`;
	}

	if (filterLinkHoverColor) {
		css +=
			`${root}.modula-gallery .filters a.modula_menu__link:hover,` +
			`${root}.modula-gallery .filters .modula_menu__item--current .modula_menu__link{color:${filterLinkHoverColor} !important;border-bottom-color:${filterLinkHoverColor} !important;}`;
	}

	return css;
}
