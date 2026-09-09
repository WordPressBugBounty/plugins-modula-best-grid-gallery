/**
 * Vanilla Modula lightbox open pipeline (@fancyapps/ui v6, no jQuery).
 *
 * Public callers should prefer `lightboxOpenFacade.js` (bind / open-at-root) or
 * `lightboxOpenFacade.session.js` (open / close / preview patch). This file is
 * the open-pipeline implementation.
 *
 * @package
 */
import DOMPurify from 'dompurify';
import { Fancybox } from '@fancyapps/ui/dist/fancybox/fancybox.js';
import { Hash } from '@fancyapps/ui/dist/fancybox/fancybox.hash.js';
import {
	dispatchModulaCarouselSelectSlide,
	dispatchModulaFancyboxBeforeOpen,
	dispatchModulaFancyboxEvent,
} from './modulaLightboxEvents';
import {
	applyLightboxPreviewBackgroundColor,
	attachModulaLightboxPreviewDecorativeToolbar,
} from './lightboxPreviewLivePatch';
import {
	applyReducedMotionToFancyboxV6Opts,
	shouldSuppressGalleryMotionFromHost,
} from '../utils/reducedMotion';
import {
	prepareModulaLightboxV6,
	wireModulaLightboxShareToolbarClick,
} from './prepareModulaLightboxV6';
import { normalizeLightboxCaptionHtml } from '../utils/lightboxCaptionExtra';
import {
	attachModulaLightboxCompactToolbar,
	detachModulaLightboxCompactToolbar,
} from './modulaLightboxCompactToolbar';
import {
	attachModulaNativeLightboxZoom,
	detachModulaNativeLightboxZoom,
	refreshModulaNativeLightboxZoom,
} from './modulaNativeLightboxZoom';
import {
	attachModulaLightboxImageProtection,
	detachModulaLightboxImageProtection,
	refreshModulaLightboxImageProtection,
} from './modulaLightboxImageProtection';
import { releaseModulaGalleryItemPointerFocusFromContext } from './releaseModulaGalleryItemPointerFocus';
import { resolveModulaLightboxFancyboxOpts } from '../utils/lightboxSettingsToFancyboxOpts';

export { applyModulaLightboxPreviewPatch } from './lightboxPreviewLivePatch';
export { wireModulaLightboxShareToolbarClick } from './prepareModulaLightboxV6';

/** Allows programmatic teardown; user close stays blocked when editorPreview. */
let programmaticCloseAllowed = false;

/** @type {boolean} */
let fancyboxHashSetupDone = false;

/**
 * Register Fancybox Hash once so URL sync works when `Hash: { slug }` is set.
 */
function ensureFancyboxHashSetup() {
	if (fancyboxHashSetupDone) {
		return;
	}
	Hash.setup(Fancybox);
	fancyboxHashSetupDone = true;
}

/** @type {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance|null} */
let editorPreviewInstance = null;

/** @type {HTMLElement|null} Host element that opened the current visitor lightbox. */
let activeGalleryHostEl = null;

/**
 * @returns {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance|null}
 */
export function getModulaLightboxPreviewInstance() {
	if (editorPreviewInstance?.getCarousel?.()) {
		return editorPreviewInstance;
	}
	return null;
}

/**
 * Whether an open Modula lightbox was triggered from within this gallery root.
 *
 * @param {HTMLElement} galleryElement `.modula.modula-gallery` or descendant host.
 * @returns {boolean}
 */
export function isModulaLightboxActiveForGalleryElement(galleryElement) {
	if (!activeGalleryHostEl || !(galleryElement instanceof HTMLElement)) {
		return false;
	}
	const galleryRoot =
		galleryElement.closest('.modula.modula-gallery') || galleryElement;
	return (
		galleryRoot.contains(activeGalleryHostEl) ||
		activeGalleryHostEl === galleryElement
	);
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
function cleanupPauseOnHover(fancybox) {
	const listeners = fancybox.modulaPauseOnHover;
	if (listeners?.hostEl && listeners.mouseover && listeners.mouseout) {
		listeners.hostEl.removeEventListener('mouseover', listeners.mouseover);
		listeners.hostEl.removeEventListener('mouseout', listeners.mouseout);
	}
	fancybox.modulaPauseOnHover = null;
}

/**
 * Resolve the current lightbox image surface (not the whole carousel chrome).
 *
 * Fancybox v6 Zoomable mounts Panzoom on the slide itself (`.f-zoomable`), so
 * that node fills the viewport and must not be used for pause-on-hover.
 * Prefer `.f-panzoom__wrapper` (image-sized). The wrapper keeps a
 * visibility:hidden clone; pointer events hit the viewport child inside it.
 *
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 * @returns {HTMLElement|null}
 */
function resolvePauseOnHoverTarget(fancybox) {
	const container = fancybox.getContainer?.();
	const scope =
		container instanceof HTMLElement
			? container
			: document.querySelector('.modula-fancybox-container');
	if (!(scope instanceof HTMLElement)) {
		return null;
	}

	const selectedSlide =
		scope.querySelector('.fancybox__slide.is-selected') ||
		scope.querySelector('.f-carousel__slide.is-selected') ||
		scope.querySelector('.fancybox__slide') ||
		null;

	if (!(selectedSlide instanceof HTMLElement)) {
		return null;
	}

	const imageSurface =
		selectedSlide.querySelector('.f-panzoom__wrapper') ||
		selectedSlide.querySelector('.f-panzoom__viewport') ||
		selectedSlide.querySelector(
			'.f-panzoom__viewport .f-panzoom__content'
		) ||
		selectedSlide.querySelector('.fancybox__content img') ||
		selectedSlide.querySelector('img:not(.is-clone)');

	return imageSurface instanceof HTMLElement ? imageSurface : null;
}

/**
 * @param {Node|null|undefined} node
 * @param {HTMLElement|null} imageEl
 * @returns {boolean}
 */
function isNodeInsidePauseOnHoverTarget(node, imageEl) {
	return (
		imageEl instanceof HTMLElement &&
		node instanceof Node &&
		imageEl.contains(node)
	);
}

/**
 * Apply loop / autoplay on HTML5 video in the current Fancybox slide.
 * Prefer unmuted playback (lightbox open is a user gesture); mute only if play() is rejected.
 *
 * @param {import('@fancyapps/ui').Fancybox} fancybox
 */
function applyModulaVideoSlideAttrs(fancybox) {
	try {
		const slide = fancybox.getSlide?.() || fancybox.getCarousel?.()?.page;
		const el =
			slide?.el instanceof HTMLElement
				? slide.el
				: fancybox.getContainer?.();
		if (!(el instanceof HTMLElement)) {
			return;
		}
		const videoEl = el.querySelector('video');
		if (!(videoEl instanceof HTMLVideoElement)) {
			return;
		}
		const opts =
			slide?.opts && typeof slide.opts === 'object' ? slide.opts : {};
		if (opts.modulaVideoLoop === 1 || opts.modulaVideoLoop === true) {
			videoEl.loop = true;
		}
		if (
			opts.modulaVideoAutoplay === 1 ||
			opts.modulaVideoAutoplay === true
		) {
			videoEl.autoplay = true;
			videoEl.muted = false;
			const playAttempt = videoEl.play?.();
			if (playAttempt && typeof playAttempt.catch === 'function') {
				playAttempt.catch(() => {
					videoEl.muted = true;
					videoEl.play()?.catch?.(() => {});
				});
			}
		}
	} catch {
		// ignore
	}
}

/**
 * Pause autoplay only while the pointer is over the current image (legacy Modula).
 * Fancybox v6 built-in pauseOnHover is left off — it targets the full carousel.
 *
 * Delegates from the stable Fancybox container because Panzoom replaces the
 * image wrapper after Carousel.ready, which would detach direct listeners.
 *
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
function attachPauseOnHover(fancybox) {
	const options = fancybox.getOptions();
	const carousel = fancybox.getCarousel();
	const autoplayPlugin = carousel?.getPlugins?.()?.Autoplay;
	const pauseOnHover = Boolean(options?.modulaPauseOnHover);
	const hostEl = fancybox.getContainer?.();

	if (!pauseOnHover || !autoplayPlugin || !(hostEl instanceof HTMLElement)) {
		return;
	}

	if (fancybox.modulaPauseOnHover?.hostEl === hostEl) {
		syncPauseOnHoverState(fancybox);
		return;
	}

	cleanupPauseOnHover(fancybox);

	const listeners = {
		hostEl,
		paused: false,
		mouseover: null,
		mouseout: null,
	};

	const pauseAutoplay = () => {
		const currentAutoplay = fancybox
			.getCarousel()
			?.getPlugins?.()?.Autoplay;
		if (currentAutoplay?.isEnabled?.()) {
			listeners.paused = true;
			currentAutoplay.pause?.();
			/*
			 * Fancybox Autoplay.pause() clears the timer but leaves the CSS
			 * progressbar animating — remove it so hover pause is visible.
			 */
			hostEl.querySelectorAll('.f-progressbar').forEach((el) => {
				el.remove();
			});
		}
	};

	const resumeAutoplay = () => {
		const currentAutoplay = fancybox
			.getCarousel()
			?.getPlugins?.()?.Autoplay;
		if (currentAutoplay?.isEnabled?.() && listeners.paused) {
			listeners.paused = false;
			currentAutoplay.resume?.();
		}
	};

	listeners.mouseover = (event) => {
		const imageEl = resolvePauseOnHoverTarget(fancybox);
		if (
			!isNodeInsidePauseOnHoverTarget(event.relatedTarget, imageEl) &&
			isNodeInsidePauseOnHoverTarget(event.target, imageEl)
		) {
			pauseAutoplay();
		}
	};

	listeners.mouseout = (event) => {
		const imageEl = resolvePauseOnHoverTarget(fancybox);
		if (
			isNodeInsidePauseOnHoverTarget(event.target, imageEl) &&
			!isNodeInsidePauseOnHoverTarget(event.relatedTarget, imageEl)
		) {
			resumeAutoplay();
		}
	};

	fancybox.modulaPauseOnHover = listeners;
	hostEl.addEventListener('mouseover', listeners.mouseover);
	hostEl.addEventListener('mouseout', listeners.mouseout);
	syncPauseOnHoverState(fancybox);
}

/**
 * Sync pause/resume when the pointer is already over (or off) the image.
 *
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance} fancybox
 */
function syncPauseOnHoverState(fancybox) {
	const listeners = fancybox.modulaPauseOnHover;
	if (!listeners) {
		return;
	}

	const imageEl = resolvePauseOnHoverTarget(fancybox);
	const overImage =
		imageEl instanceof HTMLElement &&
		typeof imageEl.matches === 'function' &&
		imageEl.matches(':hover');

	const currentAutoplay = fancybox.getCarousel()?.getPlugins?.()?.Autoplay;
	if (!currentAutoplay?.isEnabled?.()) {
		return;
	}

	if (overImage) {
		listeners.paused = true;
		currentAutoplay.pause?.();
		const hostEl = fancybox.getContainer?.();
		if (hostEl instanceof HTMLElement) {
			hostEl.querySelectorAll('.f-progressbar').forEach((el) => {
				el.remove();
			});
		}
		return;
	}

	if (listeners.paused) {
		listeners.paused = false;
		currentAutoplay.resume?.();
	}
}

/**
 * @param {Array<{ src?: string, caption?: string, thumb?: string, opts?: object }>} links
 * @returns {Array<object>}
 */
function sanitizeSlides(links) {
	return links.map((value) => {
		const link = { ...value };
		const imageId =
			link.opts?.image_id ||
			link.opts?.imageId ||
			link.image_id ||
			link.imageId ||
			'';
		if (imageId) {
			link.image_id = String(imageId);
			link.opts = {
				...(link.opts || {}),
				image_id: String(imageId),
			};
		}
		if (typeof link.opts?.caption !== 'undefined') {
			link.caption = normalizeLightboxCaptionHtml(
				DOMPurify.sanitize(String(link.opts.caption), {
					ADD_TAGS: ['svg', 'path'],
					ADD_ATTR: [
						'target',
						'viewBox',
						'xmlns',
						'width',
						'height',
						'fill',
						'd',
					],
				})
			);
			link.opts = {
				...(link.opts || {}),
				caption: link.caption,
			};
		}
		if (typeof link.opts?.thumb !== 'undefined') {
			link.thumbSrc = link.opts.thumb;
		}
		if (link.thumb && !link.thumbSrc) {
			link.thumbSrc = link.thumb;
		}
		return link;
	});
}

/**
 * @param {object} v6Opts
 * @param {object} context
 * @param {object} userOn
 * @returns {object}
 */
function buildEventHandlers(v6Opts, context, userOn = {}, modulaSlides = []) {
	return {
		...userOn,
		init: (fancybox) => {
			fancybox.modulaSlideSources = modulaSlides;
			applyLightboxPreviewBackgroundColor(
				fancybox.getContainer?.(),
				context.previewBackgroundColor
			);
			dispatchModulaFancyboxEvent('init', fancybox);
			if (typeof userOn.init === 'function') {
				userOn.init(fancybox);
			}
		},
		ready: (fancybox) => {
			const container = fancybox.getContainer?.();
			applyLightboxPreviewBackgroundColor(
				container,
				context.previewBackgroundColor
			);
			if (context.editorPreview) {
				attachModulaLightboxPreviewDecorativeToolbar(container);
			}
			dispatchModulaFancyboxEvent('ready', fancybox);
			if (typeof userOn.ready === 'function') {
				userOn.ready(fancybox);
			}
		},
		shouldClose: (fancybox, event) => {
			if (
				context.editorPreview &&
				!programmaticCloseAllowed &&
				event?.preventDefault
			) {
				event.preventDefault();
			}
			if (typeof userOn.shouldClose === 'function') {
				userOn.shouldClose(fancybox, event);
			}
		},
		destroy: (fancybox) => {
			cleanupPauseOnHover(fancybox);
			detachModulaNativeLightboxZoom(fancybox);
			detachModulaLightboxImageProtection(fancybox);
			detachModulaLightboxCompactToolbar(fancybox);
			if (context.editorPreview) {
				editorPreviewInstance = null;
			}
			activeGalleryHostEl = null;
			releaseModulaGalleryItemPointerFocusFromContext(context);
			dispatchModulaFancyboxEvent('close', fancybox);
			dispatchModulaFancyboxEvent('destroy', fancybox);
			if (typeof userOn.destroy === 'function') {
				userOn.destroy(fancybox);
			}
		},
		reveal: (fancybox) => {
			if (!context.editorPreview) {
				refreshModulaNativeLightboxZoom(fancybox);
				refreshModulaLightboxImageProtection(fancybox);
			}
			applyModulaVideoSlideAttrs(fancybox);
			dispatchModulaFancyboxEvent('Carousel_reveal', fancybox);
			if (typeof userOn.reveal === 'function') {
				userOn.reveal(fancybox);
			}
		},
		'Carousel.ready': (fancybox) => {
			queueMicrotask(() => {
				const carousel = fancybox.getCarousel?.();
				carousel?.updateMetrics?.();
			});
			attachModulaLightboxCompactToolbar(fancybox);
			if (context.editorPreview) {
				attachModulaLightboxPreviewDecorativeToolbar(
					fancybox.getContainer?.()
				);
			}
			attachPauseOnHover(fancybox);
			if (!context.editorPreview) {
				attachModulaNativeLightboxZoom(fancybox);
				attachModulaLightboxImageProtection(fancybox);
			}
			applyModulaVideoSlideAttrs(fancybox);
			dispatchModulaFancyboxEvent('Carousel_ready', fancybox);
			const readyIndex = fancybox.getCarousel()?.getPageIndex?.() ?? 0;
			dispatchModulaCarouselSelectSlide(fancybox, readyIndex, v6Opts);
			if (typeof userOn['Carousel.ready'] === 'function') {
				userOn['Carousel.ready'](fancybox);
			}
		},
		'Carousel.change': (fancybox) => {
			attachPauseOnHover(fancybox);
			if (!context.editorPreview) {
				refreshModulaNativeLightboxZoom(fancybox);
				refreshModulaLightboxImageProtection(fancybox);
			}
			applyModulaVideoSlideAttrs(fancybox);
			const index = fancybox.getCarousel()?.getPageIndex?.() ?? 0;
			dispatchModulaFancyboxEvent('Carousel_change', fancybox);
			dispatchModulaCarouselSelectSlide(fancybox, index, v6Opts);
			if (typeof userOn['Carousel.change'] === 'function') {
				userOn['Carousel.change'](fancybox);
			}
			if (typeof userOn['Carousel.selectSlide'] === 'function') {
				userOn['Carousel.selectSlide'](fancybox, 'Carousel.change', {
					index,
				});
			}
		},
		'Carousel.click': (fancybox, _carousel, event) => {
			if (typeof userOn['Carousel.click'] === 'function') {
				userOn['Carousel.click'](fancybox, _carousel, event);
			}
			if (context.editorPreview) {
				return;
			}
			const target = event?.srcEvent?.target ?? event?.target;
			if (!(target instanceof Element)) {
				return;
			}
			if (
				target.closest(
					'.f-button, [data-fancybox-close], .fancybox__toolbar, .f-thumbs, .fancybox__thumbs, a, button, input, textarea, select'
				)
			) {
				return;
			}
			if (
				!target.closest(
					'.f-panzoom__content, .f-zoomable, .fancybox__slide, .f-panzoom'
				)
			) {
				return;
			}

			const pageIndex = fancybox.getCarousel?.()?.getPageIndex?.() ?? 0;
			const sources = Array.isArray(fancybox.modulaSlideSources)
				? fancybox.modulaSlideSources
				: modulaSlides;
			const slide = sources[pageIndex];
			const itemUrl =
				typeof slide?.opts?.modulaItemUrl === 'string'
					? slide.opts.modulaItemUrl.trim()
					: typeof slide?.modulaItemUrl === 'string'
						? slide.modulaItemUrl.trim()
						: '';
			if (itemUrl) {
				const openBlank =
					slide?.opts?.modulaItemUrlTarget === '_blank' ||
					slide?.modulaItemUrlTarget === '_blank';
				if (openBlank) {
					window.open(itemUrl, '_blank', 'noopener,noreferrer');
				} else {
					window.location.assign(itemUrl);
				}
				return;
			}

			if (!v6Opts.modulaCloseOnContentClick) {
				return;
			}
			fancybox.close?.(event?.srcEvent ?? event);
		},
	};
}

/**
 * @param {Array<{ src?: string, caption?: string, thumb?: string, opts?: object }>} links
 * @param {object} lightboxOpts Modula lightbox options.
 * @param {number} index
 * @param {object} [context]
 * @param {boolean} [context.editorPreview]
 * @param {boolean} [context.isMobile]
 * @param {string} [context.previewBackgroundColor]
 * @param {string} [context.shareButtonsJson]
 * @param {boolean} [context.openedViaKeyboard] When false, skip Fancybox placeFocusBack (avoids stuck hover :focus-within).
 * @param {HTMLElement} [context.galleryHostEl] Gallery host for hover-state refresh on close.
 * @param {HTMLElement} [context.clickedTileEl] Tile that opened the lightbox.
 * @param {Object} [context.settings] Grouped settings — when set, remap wins over lightboxOpts.
 * @param {number} [context.galleryId]
 * @param {Object} [context.galleryComments]
 * @param {'desktop'|'tablet'|'mobile'} [context.previewViewport]
 * @returns {unknown}
 */
export function openModulaLightbox(links, lightboxOpts, index, context = {}) {
	closeModulaLightbox();

	activeGalleryHostEl =
		context.galleryHostEl instanceof HTMLElement
			? context.galleryHostEl
			: null;

	const resolvedLightboxOpts = resolveModulaLightboxFancyboxOpts({
		settings: context.settings,
		lightboxOpts,
		galleryId: context.galleryId,
		editorPreview: context.editorPreview,
		galleryComments: context.galleryComments,
		previewViewport: context.previewViewport,
	});

	const sanitized = sanitizeSlides(links);
	let { v6Opts, previewBackgroundColor, runtimeContext, userEventHandlers } =
		prepareModulaLightboxV6(resolvedLightboxOpts, context, {
			startIndex: index,
			slideCount: sanitized.length,
		});

	/*
	 * Visitor frontend + Interaction “No animation…” + OS reduce: Fancybox mounts
	 * outside the gallery root, so kill open/close / slide motion here (not only CSS).
	 */
	if (
		!context.editorPreview &&
		shouldSuppressGalleryMotionFromHost(activeGalleryHostEl)
	) {
		v6Opts = applyReducedMotionToFancyboxV6Opts(v6Opts);
	}

	// Mouse-opened tiles use :focus-within hover styles; refocusing the link on close
	// leaves the hover effect stuck until the user clicks elsewhere.
	if (!context.editorPreview && context.openedViaKeyboard === false) {
		v6Opts.placeFocusBack = false;
	}

	if (v6Opts.Hash && v6Opts.Hash !== false) {
		ensureFancyboxHashSetup();
	}

	v6Opts.on = buildEventHandlers(
		v6Opts,
		runtimeContext,
		userEventHandlers,
		sanitized
	);

	wireModulaLightboxShareToolbarClick(v6Opts, runtimeContext);

	dispatchModulaFancyboxBeforeOpen(sanitized, v6Opts, v6Opts.startIndex);

	const instance = Fancybox.show(sanitized, v6Opts);
	if (Boolean(context.editorPreview) && instance) {
		editorPreviewInstance = instance;
	}
	applyLightboxPreviewBackgroundColor(
		instance?.getContainer?.(),
		previewBackgroundColor
	);
	return instance;
}

export function closeModulaLightbox() {
	editorPreviewInstance = null;
	activeGalleryHostEl = null;
	programmaticCloseAllowed = true;
	try {
		Fancybox.close(true);
	} finally {
		programmaticCloseAllowed = false;
	}
}

export { Fancybox };

if (typeof window !== 'undefined') {
	window.ModulaFancybox = Fancybox;
}
