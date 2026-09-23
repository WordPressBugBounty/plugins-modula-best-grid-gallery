/**
 * When gallery editor layout steps must leave the stack.
 *
 * @package
 */

/**
 * Layout history does not outlive a settings-driven cell reshuffle.
 *
 * @param {{
 *   prevType?: unknown,
 *   nextType?: unknown,
 *   cellsMutated?: boolean,
 * }} [args]
 * @return {boolean} True when layout steps must be removed from the stack.
 */
export function shouldDropGalleryEditorLayoutSteps(args = {}) {
	const prev = String(args.prevType ?? '');
	const next = String(args.nextType ?? '');
	if (prev === 'custom-grid' && next !== 'custom-grid') {
		return true;
	}
	return (
		prev === 'custom-grid' &&
		next === 'custom-grid' &&
		Boolean(args.cellsMutated)
	);
}

/**
 * @param {(() => void)|null|undefined} dropLayoutSteps
 * @param {{
 *   prevType?: unknown,
 *   nextType?: unknown,
 *   cellsMutated?: boolean,
 * }} [args]
 * @return {boolean} True when layout steps were dropped.
 */
export function dropGalleryEditorLayoutStepsIfNeeded(
	dropLayoutSteps,
	args = {}
) {
	if (
		typeof dropLayoutSteps !== 'function' ||
		!shouldDropGalleryEditorLayoutSteps(args)
	) {
		return false;
	}
	dropLayoutSteps();
	return true;
}
