/**
 * Live lightbox preview updates without full Fancybox teardown.
 *
 * @package
 */
import { isLightboxToggleOn } from '../utils/lightboxSettingsToFancyboxOpts';
import {
	prepareModulaLightboxV6,
	wireModulaLightboxShareToolbarClick,
} from './prepareModulaLightboxV6';
import {
	attachModulaLightboxCompactToolbar,
	detachModulaLightboxCompactToolbar,
} from './modulaLightboxCompactToolbar';

const PREVIEW_INTERACTIVE_TOOLBAR_SELECTOR = '[data-fancybox-toggle-thumbs]';

/**
 * Stable toolbar shape for preview reopen / patch guards.
 *
 * @param {object|null|undefined} carouselOpts Fancybox v6 `Carousel` options.
 * @return {string}
 */
export function getLightboxCarouselToolbarSignature(carouselOpts) {
	const toolbar = carouselOpts?.Toolbar;
	if (!toolbar || typeof toolbar !== 'object') {
		return JSON.stringify({ enabled: false, left: [], right: [] });
	}
	return JSON.stringify({
		enabled: Boolean(toolbar.enabled),
		left: Array.isArray(toolbar.display?.left) ? toolbar.display.left : [],
		right: Array.isArray(toolbar.display?.right)
			? toolbar.display.right
			: [],
	});
}

/**
 * Fancybox keeps slide-level close buttons when Carousel.Toolbar is reInit'd live but
 * top-level closeButton is left stale (e.g. was "auto"). Modula never uses slide close.
 *
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance|null|undefined} instance
 * @param {boolean|false|'auto'} closeButton
 */
function syncFancyboxSlideCloseButton(instance, closeButton) {
	const fancyboxOptions = instance?.getOptions?.();
	if (fancyboxOptions) {
		fancyboxOptions.closeButton = closeButton;
	}

	const container = instance?.getContainer?.();
	if (!(container instanceof HTMLElement)) {
		return;
	}

	container
		.querySelectorAll(
			'.fancybox__slide .is-close-button, .fancybox__slide [data-fancybox-close]'
		)
		.forEach((node) => {
			node.remove();
		});
	container
		.querySelectorAll('.fancybox__slide.has-close-btn')
		.forEach((slide) => {
			slide.classList.remove('has-close-btn');
		});
}

/**
 * Toolbar buttons in the settings-editor preview are visual only (except thumbs toggle).
 *
 * @param {HTMLElement|null|undefined} container
 */
export function attachModulaLightboxPreviewDecorativeToolbar(container) {
	if (!(container instanceof HTMLElement)) {
		return;
	}
	if (container.dataset.modulaPreviewToolbarGuard === '1') {
		return;
	}
	container.dataset.modulaPreviewToolbarGuard = '1';

	container.addEventListener(
		'click',
		(event) => {
			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			const control = target.closest(
				'.fancybox__toolbar .f-button, .fancybox__toolbar a.f-button'
			);
			if (!(control instanceof HTMLElement)) {
				return;
			}

			if (
				control.matches(PREVIEW_INTERACTIVE_TOOLBAR_SELECTOR) ||
				control.querySelector(PREVIEW_INTERACTIVE_TOOLBAR_SELECTOR) ||
				control.matches('[data-modula-toolbar-more]') ||
				control.closest('.modula-lightbox-toolbar-overflow')
			) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		},
		true
	);
}

/**
 * Settings that change DOM template / slide list and require a full reopen.
 *
 * @param {Array<{ src?: string, caption?: string, thumb?: string, thumbSrc?: string }>} slides
 * @param {object} groupedSettings
 * @param {'desktop'|'tablet'|'mobile'} previewViewport
 * @returns {string}
 */
export function getLightboxPreviewStructuralSignature(
	slides,
	groupedSettings,
	previewViewport
) {
	const lightbox = groupedSettings?.lightbox || {};
	const thumbsPosition = lightbox.thumbsPosition || 'bottom';
	const sidebarThumbsLayout =
		thumbsPosition !== 'bottom' &&
		previewViewport !== 'mobile' &&
		(isLightboxToggleOn(lightbox.thumbs) ||
			isLightboxToggleOn(lightbox.showThumbnails));
	const commentsEnabled = isLightboxToggleOn(
		groupedSettings?.comments?.commentStatus
	);

	return JSON.stringify({
		slides: (slides || []).map((slide) => ({
			src: slide.src || '',
			caption: slide.opts?.caption ?? slide.caption ?? '',
			thumb: slide.opts?.thumb ?? slide.thumbSrc ?? slide.thumb ?? '',
		})),
		previewViewport,
		commentsEnabled,
		showTitle: isLightboxToggleOn(lightbox.showTitle),
		showCaption: isLightboxToggleOn(lightbox.showCaption),
		thumbsPosition,
		thumbsLayout: commentsEnabled
			? sidebarThumbsLayout
				? `comments-sidebar-${thumbsPosition}`
				: 'comments-bottom-modern'
			: sidebarThumbsLayout
				? `sidebar-${thumbsPosition}`
				: 'bottom-modern',
		lightboxZoom: isLightboxToggleOn(lightbox.zoom),
		lightboxDownload: isLightboxToggleOn(lightbox.download),
		lightboxShare: isLightboxToggleOn(lightbox.share),
		lightboxInfobar: isLightboxToggleOn(lightbox.infobar),
		lightboxFullscreen: isLightboxToggleOn(lightbox.enableFullscreen),
		lightboxSlideshow: isLightboxToggleOn(
			groupedSettings?.slideshow?.enableSlideshow
		),
		lightboxDownloadAll: isLightboxToggleOn(lightbox.downloadAllButton),
		thumbsToolbar: isLightboxToggleOn(lightbox.thumbs),
		showThumbnails: isLightboxToggleOn(lightbox.showThumbnails),
		loopLightbox: isLightboxToggleOn(lightbox.loop),
		toolbarEnabled: isLightboxToggleOn(lightbox.toolbar),
		showClose: isLightboxToggleOn(lightbox.close),
		// Top-level Fancybox opts (wheel / backdropClick / click close) need a reopen.
		wheelNavigation: true,
		closeOnContentClick: isLightboxToggleOn(lightbox.clickSlide),
	});
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {string} backgroundColor
 */
export function applyLightboxPreviewBackgroundColor(
	container,
	backgroundColor
) {
	if (!container || !backgroundColor) {
		return;
	}
	// Fancybox v6: --fancybox-backdrop-bg. Legacy / editor preview: --fancybox-bg.
	container.style.setProperty('--fancybox-backdrop-bg', backgroundColor);
	container.style.setProperty('--fancybox-bg', backgroundColor);
	container.style.setProperty('--fancybox-opacity', '1');
	const backdrop = container.querySelector('.fancybox__backdrop');
	if (backdrop instanceof HTMLElement) {
		backdrop.style.background = backgroundColor;
		backdrop.style.opacity = '1';
	}
}

/**
 * @param {import('@fancyapps/ui/dist/fancybox/fancybox.js').FancyboxInstance|null|undefined} instance
 * @param {object} lightboxOpts
 * @param {object} [context]
 * @param {boolean} [context.editorPreview]
 * @param {boolean} [context.isMobile]
 * @param {string} [context.previewBackgroundColor]
 * @param {string} [context.previewViewport]
 * @param {string} [context.shareButtonsJson]
 * @returns {boolean}
 */
export function applyModulaLightboxPreviewPatch(
	instance,
	lightboxOpts,
	context = {}
) {
	const carousel = instance?.getCarousel?.();
	if (!carousel) {
		return false;
	}

	const slideCount =
		typeof context.slideCount === 'number'
			? context.slideCount
			: (carousel.getSlides?.() || []).filter(
					(slide) => slide && !slide.isClone
				).length;

	const container = instance.getContainer?.();
	if (!container?.isConnected) {
		return false;
	}

	const { v6Opts, previewBackgroundColor, runtimeContext } =
		prepareModulaLightboxV6(lightboxOpts, context, { slideCount });

	applyLightboxPreviewBackgroundColor(container, previewBackgroundColor);

	syncFancyboxSlideCloseButton(instance, v6Opts.closeButton ?? false);

	const nextToolbarSignature = getLightboxCarouselToolbarSignature(
		v6Opts.Carousel
	);
	const currentToolbarSignature = getLightboxCarouselToolbarSignature(
		carousel.getOptions?.()
	);
	if (nextToolbarSignature !== currentToolbarSignature) {
		return false;
	}

	detachModulaLightboxCompactToolbar(instance);

	if (v6Opts.Carousel) {
		wireModulaLightboxShareToolbarClick(v6Opts, runtimeContext);
		carousel.reInit(v6Opts.Carousel);
	} else {
		wireModulaLightboxShareToolbarClick(v6Opts, runtimeContext);
	}

	queueMicrotask(() => {
		syncFancyboxSlideCloseButton(instance, v6Opts.closeButton ?? false);
		attachModulaLightboxCompactToolbar(instance);
	});

	const showOnStart = Boolean(v6Opts.Carousel?.Thumbs?.showOnStart);
	const thumbsPlugin = carousel.getPlugins?.()?.Thumbs;
	const thumbsEl = thumbsPlugin?.getContainer?.();
	if (thumbsEl) {
		thumbsEl.classList.toggle('is-hidden', !showOnStart);
	}

	if (context.editorPreview) {
		attachModulaLightboxPreviewDecorativeToolbar(container);
	}

	return true;
}
