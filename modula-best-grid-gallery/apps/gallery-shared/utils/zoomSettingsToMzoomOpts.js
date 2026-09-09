/**
 * Map grouped v2 zoom settings to elevateZoom (ezPlus) options — PHP parity.
 *
 * @package
 */

/**
 * @param {*} value
 * @returns {boolean}
 */
function truthy(value) {
	if (value === true || value === 1 || value === '1') {
		return true;
	}
	if (typeof value === 'string' && value.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/** @type {Record<string, number>} */
const WINDOW_POSITION = {
	upper_left: 11,
	upper_right: 1,
	lower_left: 9,
	lower_right: 3,
};

/** @type {Record<string, number>} */
const WINDOW_SIZE = {
	small: 100,
	medium: 200,
	large: 300,
	xlarge: 350,
};

/**
 * Legacy stored `basic`; elevateZoom expects `window`.
 *
 * @param {string|undefined|null} type
 * @returns {'window'|'inner'|'lens'|string}
 */
export function normalizeZoomType(type) {
	if (!type || typeof type !== 'string' || type === 'basic') {
		return 'window';
	}
	return type;
}

/**
 * @param {string|undefined|null} position
 * @returns {number}
 */
export function zoomWindowPosition(position) {
	if (typeof position === 'string' && WINDOW_POSITION[position]) {
		return WINDOW_POSITION[position];
	}
	return 11;
}

/**
 * @param {string|undefined|null} size
 * @returns {number}
 */
export function zoomWindowSize(size) {
	if (typeof size === 'string' && WINDOW_SIZE[size]) {
		return WINDOW_SIZE[size];
	}
	return 100;
}

/**
 * @param {object|null|undefined} zoom Grouped `settings.zoom`.
 * @returns {object|null} elevateZoom options or null when disabled.
 */
export function zoomSettingsToMzoomOpts(zoom) {
	if (!zoom || typeof zoom !== 'object' || !truthy(zoom.enableZoom)) {
		return null;
	}

	const zoomType = normalizeZoomType(zoom.zoomType);
	const effect =
		typeof zoom.zoomEffect === 'string' ? zoom.zoomEffect : 'fade_in';
	const fadeIn =
		effect === 'fade_in' || effect === 'fade_in_out' ? 650 : false;
	const fadeOut =
		effect === 'fade_out' || effect === 'fade_in_out' ? 650 : false;
	const tintOpacity = parseInt(zoom.zoomTintOpacity ?? 0, 10) || 0;
	const tintColor =
		typeof zoom.zoomTintColor === 'string' &&
		zoom.zoomTintColor.trim() !== ''
			? zoom.zoomTintColor.trim()
			: '#666';
	const lensShape =
		typeof zoom.zoomLensShape === 'string' && zoom.zoomLensShape !== ''
			? zoom.zoomLensShape
			: 'round';

	return {
		zoomType,
		zoomOnHover: truthy(zoom.zoomOnHover),
		zoomWindowPosition: zoomWindowPosition(zoom.zoomWindowPosition),
		zoomWindowWidth: zoomWindowSize(zoom.zoomWindowSize),
		zoomWindowHeight: zoomWindowSize(zoom.zoomWindowSize),
		lensSize: zoomWindowSize(zoom.zoomLensSize),
		zoomLensShape: lensShape,
		lensShape,
		tint: zoomType !== 'lens',
		tintColour: tintColor,
		tintOpacity: tintOpacity / 100,
		easing: effect === 'easing',
		zoomWindowFadeIn: fadeIn,
		lensFadeIn: fadeIn,
		zoomTintFadeIn: fadeIn,
		zoomWindowFadeOut: fadeOut,
		lensFadeOut: fadeOut,
		zoomTintFadeOut: fadeOut,
		zIndex: 999999999,
	};
}
