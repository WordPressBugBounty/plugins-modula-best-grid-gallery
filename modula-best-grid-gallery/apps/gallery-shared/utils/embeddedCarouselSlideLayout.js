/**
 * Embedded tile sizing inside Fancyapps carousel (slider / story).
 *
 * Image slides get a flow box from `.modula-slider-image-wrapper` (aspect-ratio).
 * Embedded tiles must establish an equivalent box on the slide root or fixed-height
 * tracks collapse and peek / visible-at-once / advance-by break.
 *
 * @package
 */

/**
 * @param {Object|null|undefined} config
 * @param {boolean} isCarouselSlide
 * @return {{ rootFlexSizing: Object, contentUsesFlowLayout: boolean }|null}
 */
export function resolveEmbeddedCarouselSlideLayout(config, isCarouselSlide) {
	if (!isCarouselSlide || config?.type !== 'slider') {
		return null;
	}
	const sliderAdaptiveHeight = !!config?.sliderCarousel?.adaptiveHeight;
	if (sliderAdaptiveHeight) {
		return null;
	}
	const aspectRatio =
		typeof config?.sliderCarousel?.slideAspectRatio === 'string' &&
		config.sliderCarousel.slideAspectRatio.trim() !== ''
			? config.sliderCarousel.slideAspectRatio.trim()
			: '16 / 9';
	return {
		rootFlexSizing: {
			/* Width omitted — Fancyapps sets --f-carousel-slide-width on the slide. */
			height: 'auto',
			minWidth: 0,
			minHeight: 0,
			aspectRatio,
		},
		contentUsesFlowLayout: true,
	};
}
