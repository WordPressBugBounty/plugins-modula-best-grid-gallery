/**
 * Keep proofing min/max selection co-dependent.
 * `maxSelection === 0` means unlimited (no upper coupling).
 */

/**
 * @param {unknown} raw
 * @return {number}
 */
export function toProofingSelectionCount(raw) {
	const n = Number(raw);
	if (!Number.isFinite(n) || n < 0) {
		return 0;
	}
	return Math.floor(n);
}

/**
 * Upper end of the minimum or maximum selection slider. A client cannot pick
 * more images than the gallery holds, and the minimum cannot pass a finite
 * maximum (`maxSelection === 0` means unlimited, so only the gallery caps it).
 *
 * @param {string}  groupedPath  `proofing.minSelection` or `proofing.maxSelection`.
 * @param {number}  imageCount   Images in the gallery.
 * @param {unknown} maxSelection Current stored maximum.
 * @return {number} Highest value the slider offers.
 */
export function proofingSelectionSliderMax(
	groupedPath,
	imageCount,
	maxSelection
) {
	const galleryCap = toProofingSelectionCount(imageCount);
	if (groupedPath !== 'proofing.minSelection') {
		return galleryCap;
	}

	const max = Math.min(toProofingSelectionCount(maxSelection), galleryCap);
	return max > 0 ? max : galleryCap;
}

/**
 * When the user edits min or max, keep min ≤ max (if max is finite).
 *
 * @param {import('@tanstack/react-form').FormApi} form
 * @param {string}                                 groupedPath
 * @param {unknown}                                value
 */
export function applyProofingSelectionSideEffects(form, groupedPath, value) {
	if (
		groupedPath !== 'proofing.minSelection' &&
		groupedPath !== 'proofing.maxSelection'
	) {
		return;
	}

	const proofing = form?.state?.values?.proofing || {};
	const next = toProofingSelectionCount(value);

	if (groupedPath === 'proofing.minSelection') {
		const max = toProofingSelectionCount(proofing.maxSelection);
		if (max > 0 && next > max) {
			form.setFieldValue('proofing.maxSelection', next);
		}
		return;
	}

	const min = toProofingSelectionCount(proofing.minSelection);
	if (next > 0 && min > next) {
		form.setFieldValue('proofing.minSelection', next);
	}
}
