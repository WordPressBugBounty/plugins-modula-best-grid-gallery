/**
 * Build @fancyapps/ui v6 Fancybox options from Modula gallery settings.
 *
 * @package
 */
import { buildDownloadAllUrl } from '../utils/downloadAllButton';
import { isModulaLightboxSidebarThumbsPosition } from '../utils/lightboxSidebarThumbs';
import {
	applyCompactCarouselToolbar,
	resolveModulaLightboxCompactToolbar,
} from './modulaLightboxCompactToolbar';

const SHARE_BUTTON_TPL =
	'<button data-fancybox-share class="f-button" title="Share"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2.55 19c1.4-8.4 9.1-9.8 11.9-9.8V5l7 7-7 6.3v-3.5c-2.8 0-10.5 2.1-11.9 4.2z"/></svg></button>';

const DOWNLOAD_ALL_BUTTON_TPL =
	'<a class="modula-fancybox-button download-all f-button" title="Download All" href="{{DOWNLOAD_ALL_URL}}"> <svg xmlns="http://www.w3.org/2000/svg" width="2480" height="3507" viewBox="0 0 2480 3507">' +
	'<rect class="cls-1" x="5" y="2512" width="2475" height="996"/>' +
	'<path id="ALL" class="cls-2" d="M627.528,2585.41L352.443,3406.16H487.6l64.474-199.75H848.647L917.9,3406.16H1054.01L759.34,2585.41H627.528Zm66.383,175.66,112.709,324.9H591.232Zm438.419-175.66v820.75h452.74V3282.19h-323.8V2585.41H1132.33Zm541.09,0v820.75h452.75V3282.19h-323.8V2585.41H1673.42Z"/>' +
	'<rect class="cls-1" x="1001" y="6" width="453" height="1506"/>' +
	'<path class="cls-3" d="M296,1399.6l295.125-296.49,406.3,408.19H1456.28L1869.66,1096,2185,1412.8,1253.13,2349Z"/>' +
	'</svg></a>';

const COMMENTS_TOGGLE_BUTTON_TPL =
	'<button class="modula-fancybox-button f-button" id="modula-comments-toggle" title="Comments"><span class="dashicons dashicons-admin-comments"></span></button>';

const ELEVATE_ZOOM_BUTTON_TPL =
	'<button title="Enable zoom" class="modula-fancybox-elevatezoom-button f-button"><svg tabindex="-1" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="7.5"></circle><path d="m21 21-4.35-4.35M11 8v6M8 11h6"></path></svg></button>';

/**
 * Whether Loop slides is on (`loop_lightbox` flat key).
 *
 * @param {object} flat
 * @returns {boolean}
 */
function isLoopLightboxEnabled(flat) {
	const raw = flat?.loop_lightbox;
	return raw === 1 || raw === true || raw === '1';
}

const V6_MAIN_TPL =
	'<dialog class="fancybox__dialog">\n' +
	'  <div class="fancybox__container" tabindex="0" aria-label="{{MODAL}}">\n' +
	'    <div class="fancybox__backdrop"></div>\n' +
	'    <div class="fancybox__carousel"></div>\n' +
	'  </div>\n' +
	'</dialog>';

const V6_SIDEBAR_MAIN_TPL = (position) =>
	'<dialog class="fancybox__dialog">\n' +
	`  <div class="fancybox__container has-sidebar" tabindex="0" aria-label="{{MODAL}}">\n` +
	'    <div class="fancybox__backdrop"></div>\n' +
	'    <div class="fancybox__carousel"></div>\n' +
	`    <div class="fancybox__sidebar ${position}" data-modula-thumbs-sidebar="${position}"></div>\n` +
	'  </div>\n' +
	'</dialog>';

/**
 * Fancybox v6 main template when Pro Comments sidebar is active.
 *
 * @param {boolean} sidebarHidden Start with comments panel collapsed.
 * @param {string|null} [thumbsSidebarPosition] Left/right thumbs strip outside comments grid.
 * @returns {string}
 */
const V6_COMMENTS_MAIN_TPL = (sidebarHidden, thumbsSidebarPosition = null) => {
	const thumbsSidebar =
		thumbsSidebarPosition && thumbsSidebarPosition !== 'bottom'
			? `    <div class="fancybox__sidebar ${thumbsSidebarPosition}" data-modula-thumbs-sidebar="${thumbsSidebarPosition}"></div>\n`
			: '';
	const thumbsSidebarClass =
		thumbsSidebarPosition && thumbsSidebarPosition !== 'bottom'
			? ' has-thumbs-sidebar'
			: '';

	return (
		'<dialog class="fancybox__dialog">\n' +
		`  <div class="fancybox__container has-sidebar has-modula-comments${thumbsSidebarClass}${
			sidebarHidden ? ' sidebar-hidden' : ''
		}" tabindex="0" aria-label="{{MODAL}}">\n` +
		'    <div class="fancybox__backdrop"></div>\n' +
		thumbsSidebar +
		'    <div class="fancybox__carousel">\n' +
		'      <div class="fancybox__grid">\n' +
		'        <div class="fancybox__column with-viewport">\n' +
		'          <div class="fancybox__viewport"></div>\n' +
		'        </div>\n' +
		'        <div class="fancybox__column with-sidebar">\n' +
		'          <div id="modula-comments-wrapper" class="fancybox__sidebar modula-comments-sidebar"></div>\n' +
		'        </div>\n' +
		'      </div>\n' +
		'    </div>\n' +
		'  </div>\n' +
		'</dialog>'
	);
};

const DEFAULT_L10N = {
	CLOSE: 'Close',
	NEXT: 'Next',
	PREV: 'Previous',
	MORE: 'More actions',
	DOWNLOAD: 'Download',
	TOGGLE_THUMBS: 'Thumbnails',
	TOGGLE_FULLSCREEN: 'Fullscreen',
	TOGGLE_AUTOPLAY: 'Slideshow',
	TOGGLE_FULL: 'Zoom',
};

/**
 * Map Modula transitionEffect values to Fancybox v6 Carousel.transition.
 *
 * @param {string|undefined} effect
 * @returns {string|undefined}
 */
function mapModulaCarouselTransition(effect) {
	if (!effect || effect === 'false') {
		return 'fade';
	}
	if (effect === 'classic') {
		// v6 has no "classic" transition type; legacy Modula used horizontal slide.
		return 'slide';
	}
	return effect;
}

/**
 * @param {boolean} enabled
 * @returns {object}
 */
function buildKeyboardMap(enabled) {
	if (enabled) {
		return {
			Escape: 'close',
			Delete: 'close',
			Backspace: 'close',
			PageUp: 'next',
			PageDown: 'prev',
			ArrowUp: 'prev',
			ArrowDown: 'next',
			ArrowRight: 'next',
			ArrowLeft: 'prev',
		};
	}
	return {
		Escape: 'close',
		Delete: 'close',
		Backspace: 'close',
		PageUp: false,
		PageDown: false,
		ArrowUp: false,
		ArrowDown: false,
		ArrowRight: false,
		ArrowLeft: false,
	};
}

/**
 * @param {object} flat
 * @param {boolean} editorPreview
 * @returns {boolean}
 */
/**
 * @param {object} flat
 * @param {boolean} [_editorPreview]
 * @returns {boolean}
 */
function shouldShowDownloadAllToolbarButton(flat, _editorPreview = false) {
	if (flat.download_all_lightbox_button !== 1) {
		return false;
	}
	// Pro Download extension: zip endpoint only works when enable_download is on.
	return flat.enable_download === 1;
}

/**
 * @param {*} raw
 * @returns {number}
 */
function resolveSlideshowAutoplayTimeoutMs(raw) {
	const n = parseInt(raw, 10);
	if (!Number.isFinite(n)) {
		return 5000;
	}
	return Math.min(30000, Math.max(1000, n));
}

/**
 * Close is always the last toolbar icon on the right.
 *
 * @param {string[]} right
 * @returns {string[]}
 */
function pinCloseLast(right) {
	const withoutClose = right.filter((key) => key !== 'close');
	if (right.includes('close')) {
		withoutClose.push('close');
	}
	return withoutClose;
}

/**
 * @param {object} flat
 * @param {boolean} [editorPreview]
 * @returns {object}
 */
function buildCarouselToolbarFromFlat(flat, editorPreview = false) {
	const toolbarEnabled = flat.lightbox_toolbar === 1;
	const left = [];
	const right = [];

	if (toolbarEnabled && flat.lightbox_infobar === 1) {
		left.push('counter');
	}

	/** @type {Record<string, unknown>|undefined} */
	let shareItem;
	/** @type {Record<string, unknown>|undefined} */
	let downloadAllItem;
	/** @type {Record<string, unknown>|undefined} */
	let toggleCommentsItem;
	/** @type {Record<string, unknown>|undefined} */
	let elevateZoomItem;

	const elevateZoomActive = flat.enable_zoom === 1;

	if (toolbarEnabled) {
		if (!elevateZoomActive && flat.lightbox_zoom === 1) {
			right.push('toggleFull');
		}
		if (flat.lightbox_share === 1) {
			shareItem = { tpl: SHARE_BUTTON_TPL };
			right.push('share');
		}
		if (flat.lightbox_download === 1) {
			right.push('download');
		}
		if (flat.lightbox_thumbs === 1) {
			right.push('thumbs');
		}
		if (flat.enable_fullscreen === 1) {
			right.push('fullscreen');
		}
		if (flat.enableSlideshow === 1) {
			right.push('autoplay');
		}
		if (
			elevateZoomActive &&
			flat.zoom_on_hover !== 1 &&
			flat.lightbox_zoom === 1
		) {
			elevateZoomItem = { tpl: ELEVATE_ZOOM_BUTTON_TPL };
			right.push('elevateZoom');
		}
		if (shouldShowDownloadAllToolbarButton(flat, editorPreview)) {
			downloadAllItem = {
				tpl: DOWNLOAD_ALL_BUTTON_TPL.replace(
					'{{DOWNLOAD_ALL_URL}}',
					buildDownloadAllUrl(flat.gallery_id, editorPreview)
				),
			};
			right.unshift('downloadAll');
		}
		if (flat.comment_status === 1 && flat.toggle_comments === 1) {
			toggleCommentsItem = { tpl: COMMENTS_TOGGLE_BUTTON_TPL };
			right.unshift('toggleComments');
		}
		if (flat.lightbox_close === 1) {
			right.push('close');
		}
	}

	const rightPinned = pinCloseLast(right);
	const hasToolbarItems = left.length > 0 || rightPinned.length > 0;

	return {
		enabled: hasToolbarItems,
		display: {
			left,
			middle: [],
			right: rightPinned,
		},
		...(shareItem ||
		downloadAllItem ||
		toggleCommentsItem ||
		elevateZoomItem
			? {
					items: {
						...(shareItem ? { share: shareItem } : {}),
						...(downloadAllItem
							? { downloadAll: downloadAllItem }
							: {}),
						...(toggleCommentsItem
							? { toggleComments: toggleCommentsItem }
							: {}),
						...(elevateZoomItem
							? { elevateZoom: elevateZoomItem }
							: {}),
					},
				}
			: {}),
	};
}

/**
 * @param {object} flat Legacy-shaped flat keys from grouped settings.
 * @param {{ galleryId?: number, editorPreview?: boolean }} [opts]
 * @returns {object} Fancybox v6 options (layout finalized at open time).
 */
/**
 * @param {object} flat
 * @returns {boolean}
 */
function isModulaLightboxThumbsEnabled(flat) {
	return flat.lightbox_thumbs === 1 || flat.lightbox_thumbsAutoStart === 1;
}

export function buildLightboxV6OptsFromFlat(flat, opts = {}) {
	const editorPreview = Boolean(opts.editorPreview);
	const thumbsPosition = flat.lightbox_thumbsPosition || 'bottom';
	const thumbsEnabled = isModulaLightboxThumbsEnabled(flat);
	const animationEffect = flat.lightbox_animationEffect;
	const hasCustomAnimation = animationEffect && animationEffect !== 'false';
	const elevateZoomActive = flat.enable_zoom === 1;

	const wheelNavEnabled = true;
	const loopLightboxEnabled = isLoopLightboxEnabled(flat);

	/** @type {Record<string, unknown>} */
	const carousel = {
		Panzoom: {
			touch: true,
		},
		// Match Pro fancybox `loop`: only explicit Loop slides — do not force-wrap for slideshow.
		infinite: loopLightboxEnabled,
		Toolbar: buildCarouselToolbarFromFlat(flat, editorPreview),
		Thumbs: thumbsEnabled
			? {
					showOnStart: flat.lightbox_thumbsAutoStart === 1,
					minCount: 2,
					position: thumbsPosition,
					type: 'modern',
					Carousel: {
						classes: {
							container: 'fancybox__thumbs',
						},
						infinite: false,
					},
				}
			: false,
		Zoomable: {
			maxScale: 2,
			/*
			 * Fancybox v6 splits wheel handling:
			 * - top-level `wheel: 'slide'|'close'|false` → lightbox prev/next/close
			 * - Panzoom `wheelAction: Zoom` (default) → image zoom
			 * Legacy Modula mapped lightbox_wheel → Fancybox `wheel: 'slide'` (navigation),
			 * never image zoom. Wheel navigation is always on; keep Panzoom wheel zoom off
			 * so scroll only navigates (legacy parity).
			 */
			Panzoom: {
				wheelAction: false,
				/*
				 * When “close on click” is on, do not steal the click for ToggleFull zoom —
				 * openModulaLightbox closes on Carousel.click instead.
				 */
				...(flat.lightbox_clickSlide === 1
					? { clickAction: false }
					: {}),
			},
		},
	};

	carousel.transition = mapModulaCarouselTransition(
		flat.lightbox_transitionEffect
	);
	carousel.fill = true;
	carousel.center = true;
	carousel.slidesPerPage = 1;

	if (flat.enableSlideshow === 1) {
		carousel.Autoplay = {
			autoStart: flat.enableAutoplay === 1,
			/*
			 * Fancybox v6 pauseOnHover binds mouseenter to the whole carousel
			 * container, so the cursor anywhere in the lightbox blocks autoplay.
			 * Modula pause-on-hover is image-scoped via openModulaLightbox
			 * (modulaPauseOnHover + attachPauseOnHover).
			 */
			pauseOnHover: false,
			timeout: resolveSlideshowAutoplayTimeoutMs(flat.slideshowSpeed),
			progressbarParentEl: (carouselInstance) => {
				const container = carouselInstance?.getContainer?.();
				return container || carouselInstance?.getViewport?.();
			},
		};
	}

	if (flat.open_fullscreen === 1 && !editorPreview) {
		carousel.Fullscreen = { autoStart: true };
	}

	if (flat.show_navigation !== 1) {
		carousel.Arrows = false;
	}

	/** @type {string[]} */
	const modulaShare = [];
	if (flat.lightbox_share === 1) {
		if (flat.lightbox_facebook === 1) {
			modulaShare.push('facebook');
		}
		if (flat.lightbox_twitter === 1) {
			modulaShare.push('twitter');
		}
		if (flat.lightbox_whatsapp === 1) {
			modulaShare.push('whatsapp');
		}
		if (flat.lightbox_linkedin === 1) {
			modulaShare.push('linkedin');
		}
		if (flat.lightbox_pinterest === 1) {
			modulaShare.push('pinterest');
		}
		if (flat.lightbox_email === 1) {
			modulaShare.push('email');
		}
	}

	/** @type {Record<string, string>} */
	const mainStyle = {
		'--f-carousel-slide-width': '100%',
		'--f-carousel-slide-height': '100%',
		'--f-carousel-slide-padding': 'clamp(12px, 2.5vh, 28px)',
		'--f-carousel-gap': '0',
	};

	const backdropColor =
		typeof flat.lightbox_background_color === 'string'
			? flat.lightbox_background_color.trim()
			: '';
	if (backdropColor !== '') {
		// Fancybox v6 backdrop uses --fancybox-backdrop-bg; keep --fancybox-bg for
		// editor preview SCSS / legacy Modula CSS that still references it.
		mainStyle['--fancybox-backdrop-bg'] = backdropColor;
		mainStyle['--fancybox-bg'] = backdropColor;
		mainStyle['--fancybox-opacity'] = '1';
	}

	/** @type {Record<string, unknown>} */
	const v6 = {
		mainClass: flat.gallery_id
			? `modula-fancybox-container modula-lightbox-${flat.gallery_id}`
			: 'modula-fancybox-container',
		mainStyle,
		mainTpl: V6_MAIN_TPL,
		modulaThumbsPosition: thumbsPosition,
		// Never use Fancybox "auto" slide close — Modula renders close only in Carousel.Toolbar.
		closeButton: false,
		/*
		 * Legacy: clickSlide + backdropClick both map to close (BC keeps backdropClick).
		 * Fancybox v6 only has backdropClick for empty slide / backdrop; image clicks are
		 * handled via modulaCloseOnContentClick in openModulaLightbox.
		 */
		backdropClick: flat.lightbox_clickSlide === 1 ? 'close' : false,
		modulaCloseOnContentClick: flat.lightbox_clickSlide === 1,
		l10n: { ...DEFAULT_L10N },
		modulaShare,
		lightboxEmailSubject:
			typeof flat.email_subject === 'string' ? flat.email_subject : '',
		lightboxEmailMessage:
			typeof flat.email_message === 'string' ? flat.email_message : '',
		Carousel: carousel,
		zoomEffect: !hasCustomAnimation,
		fadeEffect: true,
		showClass: hasCustomAnimation ? `m-${animationEffect}In` : 'f-zoomInUp',
		hideClass: hasCustomAnimation ? `m-${animationEffect}Out` : 'f-fadeOut',
		placeFocusBack: true,
		hideScrollbar: true,
		modal: true,
		keyboard: buildKeyboardMap(true),
		// Legacy BC: truthy lightbox_wheel → Fancybox `wheel: 'slide'` (prev/next navigation).
		wheel: wheelNavEnabled ? 'slide' : false,
	};

	if (backdropColor !== '') {
		// Consumed by prepareModulaLightboxV6 → applyLightboxPreviewBackgroundColor.
		v6.previewBackgroundColor = backdropColor;
	}

	if (flat.enableSlideshow === 1 && flat.pauseOnHover === 1) {
		v6.modulaPauseOnHover = true;
	}

	// Legacy Pro: Images.protected via modula_fancybox_options — modern Fancybox v6.
	if (flat.protection === 1) {
		v6.modulaImagesProtected = true;
		if (
			typeof flat.right_click_message === 'string' &&
			flat.right_click_message.trim() !== ''
		) {
			v6.modulaProtectionMessage = flat.right_click_message.trim();
		}
	}

	/*
	 * Mixed-gallery video lightbox autoplay (Fancybox v6).
	 * Plugin reads slide.autoplay ?? Carousel.Video.autoplay; Fancybox default is true.
	 * Classic PHP / legacy Fancybox still use Html.videoAutoplay — do not set that here.
	 * playVideo() tries unmuted first and only mutes if the browser rejects playback.
	 */
	carousel.Video = {
		...(carousel.Video && typeof carousel.Video === 'object'
			? carousel.Video
			: {}),
		autoplay: flat['autoplay-videos'] === 1,
	};

	// v2 React deeplink: Fancybox Hash plugin expects `Hash: { slug }` (not boolean).
	// Never enable in settings-editor preview — Hash restores the prior URL fragment on
	// close and fights takeover sidebar sync (`#!layout` / `#!lightbox`).
	if (
		!editorPreview &&
		flat.modula_deeplink === 1 &&
		flat.gallery_id !== undefined &&
		flat.gallery_id !== null &&
		flat.gallery_id !== ''
	) {
		const rawPrefix =
			typeof flat.customLinkName === 'string' &&
			flat.customLinkName.trim() !== ''
				? flat.customLinkName.trim()
				: 'modulagallery';
		const prefix = String(rawPrefix).replace(/^!/, '');
		const galleryId = String(flat.gallery_id).replace(/^jtg-?/, '');

		v6.Hash = {
			slug: `${prefix}-${galleryId}`,
		};
	}

	if (flat.comment_status === 1) {
		v6.modulaCommentsEnabled = true;
		v6.modulaCommentsCollapsed =
			flat.toggle_comments === 1 && flat.start_collapsed === 1;
	}

	if (flat.galleryComments && typeof flat.galleryComments === 'object') {
		v6.galleryComments = flat.galleryComments;
	}

	if (
		!editorPreview &&
		elevateZoomActive &&
		flat.mzoom &&
		typeof flat.mzoom === 'object'
	) {
		v6.mzoom = flat.mzoom;
		v6.modulaZoomNative = true;
	}

	return v6;
}

/**
 * @param {object} carousel
 * @param {string} thumbsPosition
 */
function applySidebarThumbsCarouselConfig(carousel, thumbsPosition) {
	carousel.Thumbs = {
		...(typeof carousel.Thumbs === 'object' ? carousel.Thumbs : {}),
		position: thumbsPosition,
		type: 'classic',
		parentEl: buildSidebarThumbsParentEl(thumbsPosition),
		Carousel: {
			...(typeof carousel.Thumbs === 'object' && carousel.Thumbs?.Carousel
				? carousel.Thumbs.Carousel
				: {}),
			vertical: true,
			infinite: false,
		},
	};
}

/**
 * @param {object} carousel
 * @param {string} thumbsPosition
 */
function applyBottomModernThumbsCarouselConfig(carousel, thumbsPosition) {
	carousel.Thumbs = {
		...(typeof carousel.Thumbs === 'object' ? carousel.Thumbs : {}),
		position: thumbsPosition,
		type: 'modern',
	};
	delete carousel.Thumbs.parentEl;
	if (carousel.Thumbs.Carousel) {
		const thumbsCarousel = { ...carousel.Thumbs.Carousel };
		delete thumbsCarousel.vertical;
		carousel.Thumbs.Carousel = {
			...thumbsCarousel,
			infinite: false,
		};
	} else {
		carousel.Thumbs.Carousel = { infinite: false };
	}
}

/**
 * @param {string} position
 * @returns {(carouselInstance: object) => HTMLElement|null}
 */
function buildSidebarThumbsParentEl(position) {
	return (carouselInstance) => {
		const carouselEl = carouselInstance?.getContainer?.();
		const container =
			carouselEl?.closest?.('.fancybox__container') ||
			carouselInstance
				?.getViewport?.()
				?.closest?.('.fancybox__container');
		if (!container) {
			return carouselEl || null;
		}
		const selector = `[data-modula-thumbs-sidebar="${position}"]`;
		let sidebar = container.querySelector(selector);
		if (!sidebar) {
			sidebar = document.createElement('div');
			sidebar.className = `fancybox__sidebar ${position}`;
			sidebar.setAttribute('data-modula-thumbs-sidebar', position);
			container.appendChild(sidebar);
		}
		return sidebar;
	};
}

/**
 * Apply device / preview runtime adjustments to v6 opts.
 *
 * @param {object} v6Opts
 * @param {{ isMobile?: boolean, compactToolbar?: boolean, editorPreview?: boolean, slideCount?: number }} [context]
 * @returns {object}
 */
export function finalizeLightboxV6Runtime(v6Opts, context = {}) {
	const next = { ...v6Opts };
	const carousel = { ...(next.Carousel || {}) };
	const compactToolbar = resolveModulaLightboxCompactToolbar(context);
	const thumbsPosition = next.modulaThumbsPosition || 'bottom';
	const commentsEnabled =
		next.galleryComments && typeof next.galleryComments === 'object';
	const thumbsConfigured = carousel.Thumbs !== false;
	const useSidebarThumbs =
		thumbsConfigured &&
		isModulaLightboxSidebarThumbsPosition({
			Thumbs: { position: thumbsPosition },
		}) &&
		!context.isMobile;

	if (commentsEnabled) {
		next.mainTpl = V6_COMMENTS_MAIN_TPL(
			Boolean(next.modulaCommentsCollapsed),
			useSidebarThumbs ? thumbsPosition : null
		);
		if (useSidebarThumbs) {
			applySidebarThumbsCarouselConfig(carousel, thumbsPosition);
		} else if (carousel.Thumbs) {
			applyBottomModernThumbsCarouselConfig(carousel, thumbsPosition);
		}
	} else if (useSidebarThumbs) {
		next.mainTpl = V6_SIDEBAR_MAIN_TPL(thumbsPosition);
		applySidebarThumbsCarouselConfig(carousel, thumbsPosition);
	} else if (carousel.Thumbs) {
		applyBottomModernThumbsCarouselConfig(carousel, thumbsPosition);
	}

	if (context.editorPreview) {
		next.modal = false;
		next.placeFocusBack = false;
		next.hideScrollbar = false;
		// Strip Hash even if a caller passed deeplink opts — URL belongs to the editor.
		delete next.Hash;
		next.keyboard = {
			Escape: false,
			Delete: false,
			Backspace: false,
			PageUp: false,
			PageDown: false,
			ArrowUp: false,
			ArrowDown: false,
			ArrowRight: false,
			ArrowLeft: false,
		};
		carousel.Fullscreen = {
			...(carousel.Fullscreen || {}),
			autoStart: false,
		};
	}

	if (compactToolbar) {
		const toolbar = carousel.Toolbar;
		const { carousel: compactCarousel, overflowKeys } =
			applyCompactCarouselToolbar(carousel);
		Object.assign(carousel, compactCarousel);
		if (overflowKeys.length > 0) {
			next.mainClass = [next.mainClass, 'has-modula-compact-toolbar']
				.filter(Boolean)
				.join(' ');
			next.modulaCompactToolbar = {
				overflowKeys,
				items: toolbar?.items || {},
			};
		}
	}

	if (next.trapFocus === false) {
		next.modal = false;
		next.placeFocusBack = false;
	}

	if (next.autoFocus === false) {
		next.placeFocusBack = false;
	}

	/*
	 * Fancyapps Carousel defaults `infinite: true`. Keep an explicit boolean so a
	 * missing/lost option cannot re-enable wrap when Loop slides is off.
	 */
	carousel.infinite = carousel.infinite === true;

	next.Carousel = carousel;
	return next;
}
