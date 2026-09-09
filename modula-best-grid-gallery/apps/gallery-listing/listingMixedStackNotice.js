/**
 * Mixed-stack listing notice: classic galleries and Beta galleries cannot share a page.
 *
 * @param {{ hasClassicGalleries?: boolean, hasBetaGalleries?: boolean }|null|undefined} stack
 * @return {boolean}
 */
export function shouldShowMixedStackNotice(stack) {
	return (
		Boolean(stack?.hasClassicGalleries) && Boolean(stack?.hasBetaGalleries)
	);
}
