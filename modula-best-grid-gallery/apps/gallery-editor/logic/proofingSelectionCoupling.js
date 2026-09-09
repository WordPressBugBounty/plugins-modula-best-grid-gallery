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
 * @param {number} min
 * @param {number} max
 * @param {number} itemCount
 * @return {{ min: number, max: number }}
 */
export function clampProofingSelectionToGallery(min, max, itemCount) {
	const galleryCap = Math.max(0, itemCount);
	let nextMin = Math.min(Math.max(0, min), galleryCap);
	const nextMax = Math.min(Math.max(0, max), galleryCap);

	if (nextMax > 0 && nextMin > nextMax) {
		nextMin = nextMax;
	}

	return { min: nextMin, max: nextMax };
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
