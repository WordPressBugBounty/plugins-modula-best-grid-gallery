/**
 * Slider "Height follows slide": the viewport height of the selected slide.
 *
 * Fancyapps measures the selected slides with `getBoundingClientRect` on every
 * render, so a transform on a slide skews it: a slide playing its Motion
 * entrance (Rise scales the tile to .96) measures short while the track
 * tweens, and the viewport keeps that height once the tween settles. These
 * helpers measure the layout box instead, which no transform changes.
 *
 * @package
 */

/**
 * Edges added to a content-box `height` to get the border box.
 */
const CONTENT_BOX_EDGES = [
	'paddingTop',
	'paddingBottom',
	'borderTopWidth',
	'borderBottomWidth',
];

/**
 * Layout height of the box Fancyapps measures in a slide (its last child, else
 * the slide), unaffected by transforms on the slide or its ancestors. Read
 * from the computed height so fractional heights survive (`offsetHeight`
 * rounds, which would clip a fraction of a pixel off the slide).
 *
 * @param {HTMLElement} slideEl
 * @return {number} Border-box height in pixels, 0 when it has no box.
 */
export function slideLayoutHeight(slideEl) {
	const box = slideEl.lastElementChild || slideEl;
	const style = window.getComputedStyle(box);
	const height = parseFloat(style.height);
	// `auto` (no box, or an inline box): only the rounded offset height is known.
	if (!Number.isFinite(height)) {
		return box.offsetHeight || 0;
	}
	if (style.boxSizing === 'border-box') {
		return height;
	}
	return CONTENT_BOX_EDGES.reduce(
		(sum, edge) => sum + (parseFloat(style[edge]) || 0),
		height
	);
}

/**
 * Sizes the viewport to the tallest slide of the selected page, as Fancyapps'
 * own adaptive height does, from layout heights. Leaves the height alone when
 * no selected slide has a box yet.
 *
 * @param {*} api Fancyapps Carousel instance.
 */
export function syncSliderAdaptiveHeight(api) {
	const viewport = api.getViewport?.();
	const slides = api.getPage?.()?.slides;
	if (!viewport || !Array.isArray(slides)) {
		return;
	}
	const height = slides.reduce(
		(tallest, slide) =>
			slide?.el
				? Math.max(tallest, slideLayoutHeight(slide.el))
				: tallest,
		0
	);
	if (height > 0) {
		viewport.style.height = `${height}px`;
	}
}
