/**
 * Fit grid image alignment inside letterboxed tiles (`layout.fitGridImageAlign`).
 *
 * @package
 */

/** @typedef {'center'|'top'|'bottom'|'left'|'right'} FitGridImageAlign */

export const FIT_GRID_IMAGE_ALIGNS = [
	'center',
	'top',
	'bottom',
	'left',
	'right',
];

/** @type {Record<FitGridImageAlign, string>} */
export const FIT_GRID_IMAGE_ALIGN_CSS = {
	center: 'center center',
	top: 'top center',
	bottom: 'bottom center',
	left: 'center left',
	right: 'center right',
};

/**
 * @param {unknown} raw
 * @return {FitGridImageAlign}
 */
export function normalizeFitGridImageAlign(raw) {
	const align = typeof raw === 'string' ? raw.trim().toLowerCase() : 'center';
	return FIT_GRID_IMAGE_ALIGNS.includes(align) ? align : 'center';
}

/**
 * @param {FitGridImageAlign} align
 * @return {string} CSS `object-position` value.
 */
export function fitGridImageAlignToObjectPosition(align) {
	const key = normalizeFitGridImageAlign(align);
	return FIT_GRID_IMAGE_ALIGN_CSS[key];
}

/**
 * @param {Object|null|undefined} config Gallery flat config from settingsToConfig.
 * @return {FitGridImageAlign}
 */
export function fitGridImageAlignFromConfig(config) {
	return normalizeFitGridImageAlign(config?.fitGridImageAlign);
}

/**
 * @param {Object|null|undefined} config Gallery flat config from settingsToConfig.
 * @return {string} CSS `object-position` for fit-grid tiles.
 */
export function fitGridContainObjectPositionFromConfig(config) {
	if (config?.type !== 'fit-grid') {
		return 'center center';
	}
	return fitGridImageAlignToObjectPosition(config?.fitGridImageAlign);
}
