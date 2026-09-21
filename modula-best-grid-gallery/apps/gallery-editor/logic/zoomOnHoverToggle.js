/**
 * Zoom on hover hub toggle ↔ Hover card treatment `zoom`.
 *
 * Projection only: checked iff cardTreatment === 'zoom'. Off clears zoom to
 * `none` but leaves lift / grayscale untouched.
 *
 * @package
 */

/**
 * @param {unknown} cardTreatment
 * @return {boolean}
 */
export function isZoomOnHoverEnabled(cardTreatment) {
	return cardTreatment === 'zoom';
}

/**
 * Next card treatment after the Zoom on hover toggle changes.
 *
 * @param {unknown} cardTreatment Current Hover card treatment.
 * @param {boolean} enabled       Desired toggle state.
 * @return {string} Next card treatment to write.
 */
export function nextCardTreatmentForZoomOnHoverToggle(
	cardTreatment,
	enabled
) {
	if (enabled) {
		return 'zoom';
	}
	if (cardTreatment === 'zoom') {
		return 'none';
	}
	return typeof cardTreatment === 'string' && cardTreatment !== ''
		? cardTreatment
		: 'none';
}
