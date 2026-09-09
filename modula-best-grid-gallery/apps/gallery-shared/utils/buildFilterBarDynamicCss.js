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
 * @param {string} align
 * @return {string}
 */
function flexAlignValue(align) {
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
 * @param {string} positioning
 * @return {boolean}
 */
function isVerticalFilterLayout(positioning) {
	return ['left', 'right', 'left_right'].includes(positioning || 'top');
}

/**
 * @param {string} root Gallery root selector (e.g. `#modula-123`).
 * @param {Object} groupedFilters `settings.filters`
 * @param {Object} config Derived flat config.
 * @return {string}
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

	if (filterLinkColor) {
		css += `${root}.modula-gallery .filters a{color:${filterLinkColor} !important;}`;
	}

	if (filterLinkHoverColor) {
		css +=
			`${root}.modula-gallery .filters a:hover,` +
			`${root}.modula-gallery .filters li.modula_menu__item--current a{color:${filterLinkHoverColor} !important;border-bottom-color:${filterLinkHoverColor} !important;}`;
	}

	return css;
}
