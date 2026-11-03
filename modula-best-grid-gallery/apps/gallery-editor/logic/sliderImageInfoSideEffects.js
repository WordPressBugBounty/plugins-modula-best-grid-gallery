/**
 * Slider "Show title and caption" ↔ the image title / caption toggles under it.
 *
 * @package
 */

import { getEffectiveGroupedPathValue } from './effectiveSettingsValue';
import { isWpTruthy } from './wpTruthy';

/**
 * The slider draws text only when Show title and caption is on and at least one
 * of Show image title / Show image caption is on (both stored inverted). Turning
 * the master on while both are off turns Show image title on, so the switch
 * shows something.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                value
 */
export function applySliderImageInfoSideEffects(form, groupedPath, value) {
	if (groupedPath !== 'slider.imageInfo' || !isWpTruthy(value)) {
		return;
	}
	const grouped = form.state.values;
	const titleHidden = isWpTruthy(
		getEffectiveGroupedPathValue(grouped, 'captions.hideTitle')
	);
	const captionHidden = isWpTruthy(
		getEffectiveGroupedPathValue(grouped, 'captions.hideDescription')
	);
	if (titleHidden && captionHidden) {
		form.setFieldValue('captions.hideTitle', false);
	}
}
