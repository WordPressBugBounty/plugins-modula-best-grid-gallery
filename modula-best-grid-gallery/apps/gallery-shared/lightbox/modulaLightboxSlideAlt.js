/**
 * The image alt of a Modula lightbox slide.
 *
 * Fancybox v6's Zoomable sets the image alt to `slide.alt || slide.caption`,
 * so an image without alt text would announce the caption's HTML. Each slide
 * carries its plain alt (`withModulaLightboxSlideAlt`), and the image gets it
 * once Fancybox attaches the slide (`applyModulaLightboxSlideAlt`).
 *
 * @package
 */

import { lightboxImageAlt } from '../utils/lightboxImageAlt';

/**
 * @param {{ alt?: unknown, opts?: { alt?: unknown } }} link Slide as the gallery builds it.
 * @return {Object} The slide with its plain alt, top level (where Fancybox reads it) and in `opts`; '' without one.
 */
export function withModulaLightboxSlideAlt(link) {
	const alt = lightboxImageAlt(link.opts?.alt ?? link.alt);
	return { ...link, alt, opts: { ...(link.opts || {}), alt } };
}

/**
 * For Fancybox's `Carousel.attachSlideEl`, which runs after Zoomable built
 * the slide's image. Panzoom may already have put its `is-clone` copy before
 * the image, so both get the alt.
 *
 * @param {{ el?: HTMLElement, alt?: unknown }} slide Fancybox slide.
 */
export function applyModulaLightboxSlideAlt(slide) {
	const images = slide?.el?.querySelectorAll?.('.f-panzoom__content') || [];
	const alt = typeof slide?.alt === 'string' ? slide.alt : '';
	for (const image of images) {
		image.setAttribute('alt', alt);
	}
}
