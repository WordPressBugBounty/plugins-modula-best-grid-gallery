/**
 * Slider slide caption placement (v2 `slider.imageInfoPosition`).
 *
 * @package
 */

/** @typedef {'top_outside'|'top_inside'|'bot_outside'|'bot_inside'} SliderCaptionPosition */

export const SLIDER_CAPTION_POSITIONS = [
	'top_outside',
	'top_inside',
	'bot_outside',
	'bot_inside',
];

/**
 * @param {unknown} raw
 * @return {SliderCaptionPosition}
 */
export function normalizeSliderCaptionPosition(raw) {
	const pos = typeof raw === 'string' ? raw.trim() : 'bot_outside';
	return SLIDER_CAPTION_POSITIONS.includes(pos) ? pos : 'bot_outside';
}

/**
 * @param {SliderCaptionPosition} position
 * @return {boolean}
 */
export function isSliderCaptionInside(position) {
	return position === 'top_inside' || position === 'bot_inside';
}

/**
 * @param {SliderCaptionPosition} position
 * @return {boolean}
 */
export function isSliderCaptionTop(position) {
	return position === 'top_outside' || position === 'top_inside';
}

/**
 * @param {string|number|undefined|null} imageId
 * @return {string}
 */
export function sliderCaptionElementId(imageId) {
	if (
		imageId === undefined ||
		imageId === null ||
		String(imageId).trim() === ''
	) {
		return '';
	}
	return `modula-slider-caption-${String(imageId).trim()}`;
}
