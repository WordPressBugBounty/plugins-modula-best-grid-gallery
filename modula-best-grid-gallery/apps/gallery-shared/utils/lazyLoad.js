/**
 * Gallery image lazy-load helpers (performance.lazyLoad / config.lazyLoad).
 *
 * @package
 */

/** @type {string} */
export const LAZY_IMAGE_ROOT_MARGIN = '240px 0px';

/**
 * @param {unknown} value
 * @return {boolean}
 */
export function isLazyLoadEnabled(value) {
	return (
		value !== false &&
		value !== 0 &&
		value !== '0' &&
		value !== null &&
		value !== undefined
	);
}
