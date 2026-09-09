/**
 * Settings-editor caption placement questions answered by layout policy.
 *
 * @package
 */

import { getLayoutPolicy } from 'gallery-shared/preview';

/**
 * @param {Object|null|undefined} captions
 * @param {string|null|undefined} galleryType
 * @return {boolean} True when layout policy allows below-image captions and placement is below-image.
 */
export function editorCaptionsAreBelowImage(captions, galleryType) {
	const policy = getLayoutPolicy({
		general: { type: typeof galleryType === 'string' ? galleryType : '' },
	});
	if (!policy.capabilities.captionsBelow) {
		return false;
	}
	if (!captions || typeof captions !== 'object') {
		return false;
	}
	const placement =
		typeof captions.contentPlacement === 'string'
			? captions.contentPlacement.trim()
			: '';
	return placement === 'below-image';
}

/**
 * @param {Object|null|undefined} captions
 * @param {string|null|undefined} galleryType
 * @return {boolean} True when the hover builder should warn about below-image captions.
 */
export function shouldShowHoverBuilderBelowImageNotice(captions, galleryType) {
	if (!editorCaptionsAreBelowImage(captions, galleryType)) {
		return false;
	}
	const hideTitle = captions?.hideTitle === true;
	const hideDescription = captions?.hideDescription === true;
	return !hideTitle || !hideDescription;
}
