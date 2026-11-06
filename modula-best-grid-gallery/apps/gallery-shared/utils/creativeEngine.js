/**
 * Creative gallery tile engine (`general.creativeEngine`).
 *
 * `packery`: the fixed-height bin-packer (`packeryLayout.js`), every tile a
 * crop. `mosaic`: Jetpack-style rows at the photos' own ratios
 * (`mosaicLayout.js`), the gallery grows with its photos. The schema default is
 * `packery` so existing galleries keep their look; new galleries are stamped
 * `mosaic` on create (spec: .scratch/creative-grid-jetpack).
 *
 * @package
 */

export const CREATIVE_ENGINE_PACKERY = 'packery';
export const CREATIVE_ENGINE_MOSAIC = 'mosaic';

/**
 * Jetpack unlocks its symmetric rows for a "wide" theme (content width over
 * 1000px); Modula reads the measured container instead.
 */
const MOSAIC_WIDE_MIN_CONTAINER_WIDTH = 1000;

/**
 * @param {Object|null|undefined} config Gallery config (`config.creativeEngine`).
 * @return {'packery'|'mosaic'} `packery` for a missing, empty or unknown value.
 */
export function resolveCreativeEngine(config) {
	return config?.creativeEngine === CREATIVE_ENGINE_MOSAIC
		? CREATIVE_ENGINE_MOSAIC
		: CREATIVE_ENGINE_PACKERY;
}

/**
 * @param {Object|null|undefined} config
 * @return {boolean}
 */
export function isMosaicCreativeEngine(config) {
	return resolveCreativeEngine(config) === CREATIVE_ENGINE_MOSAIC;
}

/**
 * The engine from whichever settings shape a rule holds: grouped v2 settings
 * (`general.creativeEngine`), the flat config (`creativeEngine`) or the flat
 * classic copy (`creative_engine`).
 *
 * @param {Object|null|undefined} context
 * @return {'packery'|'mosaic'}
 */
export function resolveCreativeEngineFromSettings(context) {
	if (!context || typeof context !== 'object') {
		return CREATIVE_ENGINE_PACKERY;
	}
	const general =
		context.general && typeof context.general === 'object'
			? context.general
			: null;
	const value =
		general?.creativeEngine ??
		context.creativeEngine ??
		context.creative_engine;
	return resolveCreativeEngine({ creativeEngine: value });
}

/**
 * @param {number} containerWidth Measured gallery width in px.
 * @return {boolean} Whether the mosaic may use its wide-only row shapes.
 */
export function isMosaicWide(containerWidth) {
	return Number(containerWidth) > MOSAIC_WIDE_MIN_CONTAINER_WIDTH;
}
