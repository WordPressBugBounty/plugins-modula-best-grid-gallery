/**
 * Fancyapps Carousel options for the “story” layout (single full-bleed slides, no dots/arrows).
 *
 * @package
 */

import { toBool } from './sliderSettingsToCarousel';

/**
 * @param {Object} settings - Grouped v2 settings (optional story overrides via settings.story).
 * @return {{
 *   carouselOptions: Object,
 *   useAutoplayPlugin: boolean,
 *   useThumbsPlugin: boolean,
 *   navigationStepBySlide: number
 * }}
 */
export function storySettingsToCarousel(settings) {
	const performance = settings?.performance || {};
	const story = settings?.story || {};

	const carouselOptions = {
		adaptiveHeight: false,
		center: false,
		Dots: false,
		transition: toBool(story.fade) ? 'fade' : 'slide',
		infinite: toBool(
			story.infinite === undefined ? false : story.infinite
		),
		slidesPerPage: 1,
		fill: true,
		Arrows: false,
		Thumbs: false,
		initialPage: 0,
		rtl: toBool(story.rtl),
	};

	if (!toBool(story.draggable === undefined ? true : story.draggable)) {
		carouselOptions.gestures = false;
	}

	if (toBool(performance.lazyLoad)) {
		carouselOptions.Lazyload = {
			preload: 2,
		};
	}

	const speed = parseInt(story.speed ?? 320, 10);
	if (Number.isFinite(speed) && speed > 0) {
		carouselOptions.tween = {
			friction: Math.max(10, Math.round(6000 / speed)),
		};
	}

	/** Stories: advance like Instagram; off only if settings.story.autoplay is explicitly false. */
	const autoplayOn =
		story.autoplay === undefined ? true : toBool(story.autoplay);
	if (autoplayOn) {
		const timeoutMs = Math.max(
			750,
			parseInt(
				story.autoplaySpeed ?? story.autoplayTimeout ?? 5000,
				10
			)
		);
		carouselOptions.Autoplay = {
			autoStart: true,
			timeout: timeoutMs,
			pauseOnHover: toBool(story.pauseOnHover),
		};
	}

	return {
		carouselOptions,
		useAutoplayPlugin: autoplayOn,
		useThumbsPlugin: false,
		navigationStepBySlide: 0,
	};
}
