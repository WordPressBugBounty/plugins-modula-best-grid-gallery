/**
 * Dual-class aliases so pre-3.0 customer CSS (.modula-navigation, .page-numbers, .current)
 * still matches Beta visitor pagination without dropping the new modula-pagination* names.
 *
 * Does not restore DOM structure (anchors/lists/sibling chrome); only class hooks on
 * the existing nav + button nodes.
 */

/**
 * @param {Object}  options
 * @param {string}  [options.position] left|center|right
 * @param {boolean} [options.loadMore]
 * @return {string}
 */
export function buildPaginationNavClassName({
	position = '',
	loadMore = false,
} = {}) {
	const parts = ['modula-pagination'];
	if (loadMore) {
		parts.push('modula-pagination--load-more');
	}
	if (position) {
		parts.push(`modula-pagination--${position}`);
	}
	parts.push('modula-navigation');
	return parts.join(' ');
}

/**
 * @param {boolean} isActive
 * @return {string}
 */
export function buildPaginationPageButtonClassName(isActive) {
	return isActive ? 'page-numbers active current' : 'page-numbers';
}

/**
 * @param {'prev'|'next'} edge
 * @return {string}
 */
export function buildPaginationEdgeButtonClassName(edge) {
	return `${edge} page-numbers`;
}
