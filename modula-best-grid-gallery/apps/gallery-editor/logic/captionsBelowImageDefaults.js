/**
 * Defaults for caption fields that only apply when content sits below the image.
 *
 * @param {Record<string, unknown>|undefined|null} captions
 */
export function normalizeCaptionsBelowImageDefaults(captions) {
	if (!captions || typeof captions !== 'object') {
		return;
	}
	if (captions.contentPlacement !== 'below-image') {
		return;
	}
	if (
		captions.belowImageAlignment === undefined ||
		captions.belowImageAlignment === null ||
		captions.belowImageAlignment === ''
	) {
		captions.belowImageAlignment = 'left';
	}
	if (
		captions.belowImageSpacing === undefined ||
		captions.belowImageSpacing === null ||
		captions.belowImageSpacing === ''
	) {
		captions.belowImageSpacing = 8;
	}
	if (
		captions.belowImagePadding === undefined ||
		captions.belowImagePadding === null ||
		captions.belowImagePadding === ''
	) {
		captions.belowImagePadding = 0;
	}
}

/**
 * Seed dependent fields when the user switches placement to below-image.
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                value
 */
export function applyCaptionsPlacementSideEffects(form, groupedPath, value) {
	if (
		groupedPath !== 'captions.contentPlacement' ||
		value !== 'below-image'
	) {
		return;
	}
	const caps = form.state.values.captions || {};
	if (!caps.belowImageAlignment) {
		form.setFieldValue('captions.belowImageAlignment', 'left');
	}
	if (
		caps.belowImageSpacing === undefined ||
		caps.belowImageSpacing === null ||
		caps.belowImageSpacing === ''
	) {
		form.setFieldValue('captions.belowImageSpacing', 8);
	}
	if (
		caps.belowImagePadding === undefined ||
		caps.belowImagePadding === null ||
		caps.belowImagePadding === ''
	) {
		form.setFieldValue('captions.belowImagePadding', 0);
	}
}
