/**
 * Gallery “respect reduced motion” helpers (Interaction → No animation for people who ask for less).
 *
 * On the **visitor frontend** only: when the setting is On and the OS asks for less motion,
 * suppress animations/transitions. Settings-editor preview keeps motion so authors can design.
 *
 * @package
 */

import { isSettingsEditorPreview } from './displayContext';

/** Fancyapps tween friction high enough to feel instant. */
export const REDUCED_MOTION_CAROUSEL_FRICTION = 100000;

/**
 * @param {Object|null|undefined} config
 * @return {boolean}
 */
export function isRespectReducedMotionSettingOn(config) {
	return config?.respectReducedMotion !== false;
}

/**
 * @return {boolean}
 */
export function prefersReducedMotion() {
	if (
		typeof window === 'undefined' ||
		typeof window.matchMedia !== 'function'
	) {
		return false;
	}
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {Object|null|undefined} config
 * @param {{ displayContext?: string }|null|undefined} metadata
 * @return {boolean}
 */
export function shouldSuppressGalleryMotion(config, metadata) {
	if (isSettingsEditorPreview(metadata)) {
		return false;
	}
	return isRespectReducedMotionSettingOn(config) && prefersReducedMotion();
}

/**
 * Gallery root has `.modula-respect-reduced-motion` when the Interaction toggle is On
 * (visitor frontend only). Combined with OS reduce → suppress Fancybox / runtime motion.
 *
 * @param {Element|null|undefined} hostEl Gallery host or descendant.
 * @return {boolean}
 */
export function shouldSuppressGalleryMotionFromHost(hostEl) {
	if (!hostEl || !prefersReducedMotion()) {
		return false;
	}
	const root =
		(typeof hostEl.closest === 'function' &&
			(hostEl.closest('.modula.modula-gallery') ||
				hostEl.closest('.modula-gallery-modern'))) ||
		hostEl;
	return Boolean(
		root?.classList?.contains('modula-respect-reduced-motion')
	);
}

/**
 * Instant / no-animation Fancyapps Carousel options (slider + story).
 *
 * @param {Object} carouselOptions
 * @return {Object}
 */
export function applyReducedMotionToCarouselOptions(carouselOptions) {
	const next = { ...(carouselOptions || {}) };
	next.transition = 'fade';
	next.tween = {
		...(next.tween && typeof next.tween === 'object' ? next.tween : {}),
		friction: REDUCED_MOTION_CAROUSEL_FRICTION,
	};
	if (next.Autoplay) {
		delete next.Autoplay;
	}
	return next;
}

/**
 * Instant open/close + slide change for Fancybox v6 (mounted outside gallery DOM).
 *
 * @param {Object} v6Opts
 * @return {Object}
 */
export function applyReducedMotionToFancyboxV6Opts(v6Opts) {
	const next = { ...(v6Opts || {}) };
	next.showClass = false;
	next.hideClass = false;
	next.zoomEffect = false;
	next.fadeEffect = false;

	const carousel = {
		...(next.Carousel && typeof next.Carousel === 'object'
			? next.Carousel
			: {}),
	};
	carousel.transition = 'fade';
	carousel.tween = {
		...(carousel.tween && typeof carousel.tween === 'object'
			? carousel.tween
			: {}),
		friction: REDUCED_MOTION_CAROUSEL_FRICTION,
	};
	if (carousel.Autoplay) {
		delete carousel.Autoplay;
	}
	next.Carousel = carousel;

	const mainClass =
		typeof next.mainClass === 'string' ? next.mainClass.trim() : '';
	next.mainClass = mainClass
		? `${mainClass} modula-respect-reduced-motion`
		: 'modula-respect-reduced-motion';

	return next;
}
