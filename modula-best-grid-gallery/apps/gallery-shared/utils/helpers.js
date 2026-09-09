/**
 * Modula Gallery - Helper Functions
 *
 * @package
 */

/**
 * Parse configuration from element data attribute or options
 *
 * @param {HTMLElement} element - Gallery element
 * @param {Object}      options - Additional options
 * @return {Object} Parsed configuration
 */
export function parseConfig(element, options = {}) {
	let config = {};

	// Try to get config from data-config attribute
	const dataConfig = element.getAttribute('data-config');
	if (dataConfig) {
		try {
			config = JSON.parse(dataConfig);
		} catch (e) {
			console.warn('Modula: Failed to parse data-config', e);
		}
	}

	// Merge with provided options (options take precedence)
	return { ...config, ...options };
}

/**
 * Debounce function
 *
 * @param {Function} func      - Function to debounce
 * @param {number}   wait      - Wait time in milliseconds
 * @param {boolean}  immediate - Whether to call immediately
 * @return {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			timeout = null;
			if (!immediate) {
				func(...args);
			}
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) {
			func(...args);
		}
	};
}

/**
 * Throttle function
 *
 * @param {Function} func  - Function to throttle
 * @param {number}   limit - Time limit in milliseconds
 * @return {Function} Throttled function
 */
export function throttle(func, limit) {
	let inThrottle;
	return function executedFunction(...args) {
		if (!inThrottle) {
			func.apply(this, args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Get viewport width
 *
 * @return {number} Viewport width
 */
export function getViewportWidth() {
	return (
		window.innerWidth ||
		document.documentElement.clientWidth ||
		document.body.clientWidth
	);
}

/**
 * Check if element is in viewport
 *
 * @param {HTMLElement} element - Element to check
 * @param {number}      offset  - Offset in pixels
 * @return {boolean} Whether element is in viewport
 */
export function isInViewport(element, offset = 0) {
	if (!element) {
		return false;
	}

	const rect = element.getBoundingClientRect();
	const windowHeight =
		window.innerHeight || document.documentElement.clientHeight;

	return (
		rect.top >= -offset &&
		rect.left >= 0 &&
		rect.bottom <= windowHeight + offset &&
		rect.right <=
			(window.innerWidth || document.documentElement.clientWidth)
	);
}

/**
 * Get responsive breakpoint values
 *
 * @param {Object} config - Gallery configuration
 * @return {Object} Responsive values
 */
export function getResponsiveValues(config) {
	const viewportWidth = getViewportWidth();
	const values = {};
	const phoneUnder = parseInt(config?.treatAsPhoneUnder ?? 600, 10) || 600;
	const tabletUnder =
		parseInt(config?.treatAsTabletUnder ?? 1024, 10) || 1024;

	if (viewportWidth <= phoneUnder) {
		// Mobile
		values.gutter = config.mobileGutter || config.gutter || 10;
		values.height = config.mobileHeight || config.height || 800;
		values.columns = config.mobileColumns || config.columns || 1;
	} else if (viewportWidth <= tabletUnder) {
		// Tablet
		values.gutter = config.tabletGutter || config.gutter || 10;
		values.height = config.tabletHeight || config.height || 800;
		values.columns = config.tabletColumns || config.columns || 2;
	} else {
		// Desktop
		values.gutter = config.desktopGutter || config.gutter || 10;
		values.height = config.desktopHeight || config.height || 800;
		values.columns = config.columns || 12;
	}

	return values;
}
