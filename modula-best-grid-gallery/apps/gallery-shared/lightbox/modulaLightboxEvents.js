/**
 * Document-level lightbox hooks for Pro extensions (CustomEvent only, no jQuery).
 *
 * Event names keep the `modula_fancybox_*` prefix for backward compatibility with
 * existing extension listeners; they are not tied to assets/js/front/modula-fancybox.js.
 *
 * @package
 */

import { resolveGalleryItemImageIdFromLightboxSlide } from '../utils/resolveGalleryItemImageId';

/**
 * @param {string} eventName Fancybox event name (dots become underscores).
 * @param {unknown} fancybox Fancybox instance.
 * @param {unknown} [payload]
 */
export function dispatchModulaFancyboxEvent(eventName, fancybox, payload) {
	const normalized = String(eventName).replace(/\./g, '_');
	document.dispatchEvent(
		new CustomEvent(`modula_fancybox_${normalized}`, {
			detail: {
				fancybox,
				instance: fancybox,
				payload,
			},
		})
	);
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 * @param {number} index
 * @param {object} opts
 */
export function dispatchModulaCarouselSelectSlide(fancybox, index, opts) {
	const carousel = fancybox?.getCarousel?.();
	const sourceSlides = Array.isArray(fancybox?.modulaSlideSources)
		? fancybox.modulaSlideSources
		: null;
	const carouselSlides = carousel?.getSlides?.();
	const slide =
		sourceSlides?.[index] ??
		carouselSlides?.[index] ??
		fancybox?.userSlides?.[index] ??
		carousel?.getPage?.()?.slides?.[0] ??
		null;
	const imageId = resolveGalleryItemImageIdFromLightboxSlide(slide);

	document.dispatchEvent(
		new CustomEvent('modula_fancybox_custom_Carousel_selectSlide', {
			detail: {
				fancybox,
				instance: fancybox,
				index,
				opts,
				slide,
				imageId,
			},
		})
	);
}

/**
 * @param {Array<unknown>} links
 * @param {object} opts
 * @param {number} index
 */
export function dispatchModulaFancyboxBeforeOpen(links, opts, index) {
	document.dispatchEvent(
		new CustomEvent('modula_fancybox_before_open', {
			detail: { links, opts, index },
		})
	);
}
