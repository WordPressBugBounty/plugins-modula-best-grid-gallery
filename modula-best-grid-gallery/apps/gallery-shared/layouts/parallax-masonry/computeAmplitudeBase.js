/**
 * Parallax masonry — amplitude from viewfinder vs content height
 *
 * @package
 */

import {
	FALLBACK_AMPLITUDE,
	MAX_AMPLITUDE_VIEWPORT_MULTIPLE,
	AMPLITUDE_OVERSHOOT,
} from './constants';

/**
 * @param {number} viewfinderHeight
 * @param {number} contentHeight
 * @return {number}
 */
export function computeAmplitudeBase(viewfinderHeight, contentHeight) {
	if (viewfinderHeight <= 0) {
		return FALLBACK_AMPLITUDE;
	}
	if (contentHeight <= viewfinderHeight) {
		return FALLBACK_AMPLITUDE;
	}
	const travelRange = contentHeight - viewfinderHeight;
	const fullRange = (travelRange / 2) * AMPLITUDE_OVERSHOOT;
	const cap = viewfinderHeight * MAX_AMPLITUDE_VIEWPORT_MULTIPLE;
	return Math.min(fullRange, cap);
}
