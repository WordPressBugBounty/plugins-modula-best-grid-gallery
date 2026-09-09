/**
 * Vanilla gallery lightbox helpers (frontend + shared layouts).
 *
 * Prefer `lightboxOpenFacade.js` for bind / open-at-root. This file holds
 * host binding and slide resolution used by that facade.
 *
 * @package
 */
import { loadModulaLightboxModule } from './loadModulaLightboxModule';
import { reportLightboxFailure } from './reportLightboxFailure';
import { releaseModulaGalleryItemPointerFocus } from './releaseModulaGalleryItemPointerFocus';
import { buildModulaLightboxSlidesFromItems } from './buildModulaLightboxSlidesFromItems';
import {
	buildLicenseCaptionHtml,
	getLicenseEntry,
	licensingTruthy,
	mergeLightboxCaptionWithLicensing,
} from '../utils/licensing';
import {
	normalizeGalleryItemImageId,
	resolveGalleryItemImageIdFromDom,
} from '../utils/resolveGalleryItemImageId';
import {
	formatVideoPlaybackUrl,
	isProbableModulaVideoPlaybackUrl,
	resolveItemLightboxVideoFlags,
} from '../video/videoGalleryModel';

/**
 * @param {object} config
 * @returns {boolean}
 */
export function isModulaLightboxAllowedOnDevice(config) {
	const devices = config?.lightbox_devices || config?.lightboxDevices;
	if (!devices || devices === 'both') {
		return true;
	}
	const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
	if (devices === 'mobile') {
		return width < 1024;
	}
	if (devices === 'desktop') {
		return width >= 1024;
	}
	return true;
}

/**
 * @param {object} [config] Gallery flat config from bootstrap.
 * @returns {string}
 */
export function resolveModulaShareButtonsJson(config) {
	if (
		config?.shareButtonsJson &&
		typeof config.shareButtonsJson === 'string'
	) {
		return config.shareButtonsJson;
	}
	if (typeof window === 'undefined') {
		return '';
	}
	const raw = window.ModulaShareButtons;
	if (typeof raw === 'string') {
		return raw;
	}
	if (raw && typeof raw === 'object') {
		try {
			return JSON.stringify(raw);
		} catch {
			return '';
		}
	}
	return '';
}

/**
 * @param {HTMLElement} rootEl
 * @returns {HTMLElement[]}
 */
export function getModulaLightboxItemElements(rootEl) {
	if (!rootEl) {
		return [];
	}
	const itemsContainer = rootEl.querySelector('.modula-items') || rootEl;
	const track = itemsContainer.querySelector('.f-carousel__track');
	const scope = track || itemsContainer;
	return [...scope.querySelectorAll('.modula-item')].filter(
		(el) => !el.classList.contains('modula-simple-link')
	);
}

/**
 * Resolve the tile link that should open the lightbox from a pointer/click event.
 * Falls back to elementFromPoint when pointer capture on a parent (Showcase
 * viewport drag) retargets the event away from `.modula-item-link`.
 *
 * @param {Event} event
 * @param {HTMLElement} hostEl
 * @returns {HTMLElement|null}
 */
export function resolveModulaLightboxClickLink(event, hostEl) {
	if (!hostEl) {
		return null;
	}
	const fromTarget = (node) => {
		if (!node || !(node instanceof Element)) {
			return null;
		}
		const link = node.closest('.modula-item-link');
		if (
			!link ||
			link.classList.contains('modula-simple-link') ||
			!hostEl.contains(link)
		) {
			return null;
		}
		return link;
	};

	const direct = fromTarget(event?.target);
	if (direct) {
		return direct;
	}

	const x = event?.clientX;
	const y = event?.clientY;
	if (
		typeof x !== 'number' ||
		typeof y !== 'number' ||
		typeof document === 'undefined' ||
		typeof document.elementFromPoint !== 'function'
	) {
		return null;
	}
	return fromTarget(document.elementFromPoint(x, y));
}

/**
 * @param {{
 *   items?: unknown[],
 *   settings?: object,
 *   config?: object,
 *   rootEl?: HTMLElement|null,
 * }} args
 * @returns {Array<{ src: string, opts: object }>}
 */
export function resolveModulaLightboxSlides({
	items,
	settings,
	config,
	rootEl,
}) {
	if (Array.isArray(items) && items.length > 0) {
		return buildModulaLightboxSlidesFromItems(items, settings, config);
	}
	if (rootEl) {
		return collectModulaLightboxSlidesFromRoot(rootEl, config);
	}
	return [];
}

/**
 * @param {HTMLElement|null|undefined} clickedLink
 * @param {Array<{ src?: string, image_id?: string, opts?: object }>} slides
 * @param {HTMLElement|null|undefined} rootEl
 * @returns {number}
 */
function resolveLightboxStartIndex(clickedLink, slides, rootEl) {
	if (!clickedLink || slides.length === 0) {
		return 0;
	}

	const imageId = normalizeGalleryItemImageId(
		clickedLink.getAttribute('data-image-id')
	);
	if (imageId > 0) {
		const byId = slides.findIndex((slide) => {
			const slideId = normalizeGalleryItemImageId(
				slide.image_id || slide.opts?.image_id
			);
			return slideId === imageId;
		});
		if (byId >= 0) {
			return byId;
		}
	}

	const img = clickedLink.querySelector('img.pic, img');
	const full =
		img?.dataset?.full ||
		img?.getAttribute('data-full') ||
		img?.getAttribute('src') ||
		'';
	if (full) {
		const bySrc = slides.findIndex((slide) => slide.src === full);
		if (bySrc >= 0) {
			return bySrc;
		}
	}

	if (rootEl) {
		const itemEls = getModulaLightboxItemElements(rootEl);
		const itemEl = clickedLink.closest('.modula-item');
		const domIndex = itemEl ? itemEls.indexOf(itemEl) : -1;
		if (domIndex >= 0 && domIndex < slides.length) {
			return domIndex;
		}
	}

	return 0;
}

/**
 * @param {HTMLElement} link
 * @param {object} [config]
 * @returns {string}
 */
function resolveLicensingCaptionForLink(link, config) {
	if (
		!config ||
		!licensingTruthy(config.showOnLightbox) ||
		!licensingTruthy(config.imageLicensingExtensionActive)
	) {
		return '';
	}
	const itemKey =
		link?.getAttribute('data-image-licensing') ||
		link?.dataset?.imageLicensing ||
		'';
	const galleryKey =
		typeof config.imageLicensing === 'string'
			? config.imageLicensing
			: 'none';
	const effectiveKey = itemKey && itemKey !== 'none' ? itemKey : galleryKey;
	const entry = getLicenseEntry(config.licenseCatalog, effectiveKey);
	return buildLicenseCaptionHtml(entry);
}

/**
 * @param {HTMLElement} itemEl
 * @param {object} [config]
 * @returns {{ src: string, opts: object }|null}
 */
export function buildModulaLightboxSlideFromItemElement(itemEl, config) {
	const link = itemEl.querySelector('.modula-item-link');
	if (!link || link.classList.contains('modula-simple-link')) {
		return null;
	}
	const img = itemEl.querySelector('img.pic');
	if (!img) {
		return null;
	}
	const full =
		img.dataset.full ||
		img.getAttribute('data-full') ||
		img.getAttribute('src') ||
		'';
	const videoFromDom = String(
		link.getAttribute('data-video-url') ||
			link.dataset?.videoUrl ||
			itemEl.getAttribute('data-video-url') ||
			''
	).trim();
	const videoUrl =
		(videoFromDom && isProbableModulaVideoPlaybackUrl(videoFromDom)
			? videoFromDom
			: '') ||
		(isProbableModulaVideoPlaybackUrl(full) ? String(full).trim() : '');
	const isVideo = videoUrl !== '';
	if (!full && !isVideo) {
		return null;
	}
	const baseCaption =
		link.dataset.caption || link.getAttribute('data-caption') || '';
	const caption = mergeLightboxCaptionWithLicensing(
		baseCaption,
		resolveLicensingCaptionForLink(link, config)
	);
	const thumb =
		link.getAttribute('data-thumb') ||
		link.dataset.thumb ||
		img.getAttribute('src') ||
		'';
	const imageId = resolveGalleryItemImageIdFromDom(itemEl);
	const imageIdStr = imageId > 0 ? String(imageId) : '';
	const itemUrl =
		link.getAttribute('data-modula-item-url') ||
		link.dataset?.modulaItemUrl ||
		'';
	const itemUrlTarget =
		link.getAttribute('data-modula-item-url-target') ||
		link.dataset?.modulaItemUrlTarget ||
		'';
	const videoSettings =
		config?.video && typeof config.video === 'object' ? config.video : {};
	const flags = isVideo
		? resolveItemLightboxVideoFlags({}, videoSettings)
		: { autoplay: false, loop: false };
	const playbackSrc = isVideo
		? formatVideoPlaybackUrl(videoUrl, {
				autoplay: flags.autoplay,
				loop: flags.loop,
				mute: false,
			})
		: full;
	if (!playbackSrc) {
		return null;
	}
	const poster = isVideo ? thumb || full || '' : thumb;
	return {
		src: playbackSrc,
		image_id: imageIdStr,
		/*
		 * Fancybox Video plugin: slide.autoplay ?? Carousel.Video.autoplay.
		 * Always set explicitly on video slides so item overrides win.
		 */
		...(isVideo ? { autoplay: flags.autoplay } : {}),
		opts: {
			caption,
			alt: img.getAttribute('alt') || '',
			thumb: poster || playbackSrc,
			...(poster && isVideo ? { poster } : {}),
			image_id: imageIdStr,
			...(isVideo
				? {
						modulaVideoAutoplay: flags.autoplay ? 1 : 0,
						modulaVideoLoop: flags.loop ? 1 : 0,
					}
				: {}),
			...(itemUrl
				? {
						modulaItemUrl: itemUrl,
						...(itemUrlTarget === '_blank'
							? { modulaItemUrlTarget: '_blank' }
							: {}),
					}
				: {}),
		},
	};
}

/**
 * @param {HTMLElement} rootEl
 * @returns {Array<{ src: string, opts: object }>}
 */
export function collectModulaLightboxSlidesFromRoot(rootEl, config) {
	return getModulaLightboxItemElements(rootEl)
		.map((itemEl) =>
			buildModulaLightboxSlideFromItemElement(itemEl, config)
		)
		.filter(Boolean);
}

/**
 * @param {{
 *   items?: unknown[],
 *   settings?: object,
 *   resolveItems?: () => Promise<unknown[]>|unknown[],
 * }} context
 * @returns {Promise<unknown[]|undefined>}
 */
async function resolveLightboxSourceItems(context = {}) {
	if (typeof context.resolveItems === 'function') {
		try {
			const resolved = await context.resolveItems();
			if (Array.isArray(resolved)) {
				return resolved;
			}
		} catch {
			// Fall through to context.items.
		}
	}
	return context.items;
}

export async function openModulaGalleryLightboxAtRoot(
	rootEl,
	config,
	startIndex = 0,
	context = {}
) {
	if (!rootEl || config?.lightbox !== 'fancybox') {
		return false;
	}
	if (!isModulaLightboxAllowedOnDevice(config)) {
		return false;
	}
	const items = await resolveLightboxSourceItems(context);
	const slides = resolveModulaLightboxSlides({
		items,
		settings: context.settings,
		config,
		rootEl,
	});
	if (slides.length === 0) {
		return false;
	}
	const index = Math.min(Math.max(0, startIndex), slides.length - 1);
	const { openModulaLightbox } = await loadModulaLightboxModule();
	openModulaLightbox(slides, config.lightboxOpts || {}, index, {
		settings: context.settings,
		galleryId: config.galleryId,
		galleryComments: config.galleryComments,
		shareButtonsJson: resolveModulaShareButtonsJson(config),
		openedViaKeyboard: Boolean(context.openedViaKeyboard),
		galleryHostEl: rootEl,
	});
	return true;
}

/**
 * @param {{
 *   rootEl: HTMLElement,
 *   clickedLink: HTMLElement,
 *   config: object,
 *   items?: unknown[],
 *   settings?: object,
 *   resolveItems?: () => Promise<unknown[]>|unknown[],
 *   openedViaKeyboard?: boolean,
 * }} args
 * @returns {Promise<boolean>}
 */
export async function openModulaGalleryLightboxFromClick({
	rootEl,
	clickedLink,
	config,
	items,
	settings,
	resolveItems,
	openedViaKeyboard = false,
}) {
	if (!rootEl || !clickedLink || config?.lightbox !== 'fancybox') {
		return false;
	}
	if (!isModulaLightboxAllowedOnDevice(config)) {
		return false;
	}

	const sourceItems = await resolveLightboxSourceItems({
		items,
		resolveItems,
	});
	const slides = resolveModulaLightboxSlides({
		items: sourceItems,
		settings,
		config,
		rootEl,
	});
	if (slides.length === 0) {
		return false;
	}

	const index = resolveLightboxStartIndex(clickedLink, slides, rootEl);
	const clickedTileEl =
		clickedLink.closest('.modula-item.modula-hover-v2') ||
		clickedLink.closest('.modula-item');

	if (!openedViaKeyboard) {
		releaseModulaGalleryItemPointerFocus(clickedLink);
	}

	const { openModulaLightbox } = await loadModulaLightboxModule();
	openModulaLightbox(slides, config.lightboxOpts || {}, index, {
		settings,
		galleryId: config.galleryId,
		galleryComments: config.galleryComments,
		shareButtonsJson: resolveModulaShareButtonsJson(config),
		openedViaKeyboard,
		galleryHostEl: rootEl,
		clickedTileEl,
	});
	return true;
}

/**
 * @param {object} config
 * @returns {boolean}
 */
function isDoubleClickToOpenEnabled(config) {
	const raw = config?.doubleClick ?? config?.mobileDoubleClick;
	return raw === true || raw === 1 || raw === '1';
}

/**
 * Touch / coarse-pointer events need a wider double-tap window than OS mouse double-clicks.
 *
 * @param {Event} event
 * @returns {boolean}
 */
function isTouchLikeActivateEvent(event) {
	if (!event || typeof event !== 'object') {
		return false;
	}
	if (event.type === 'touchend' || event.type === 'touchstart') {
		return true;
	}
	if (event.pointerType === 'touch' || event.pointerType === 'pen') {
		return true;
	}
	if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) {
		return true;
	}
	return false;
}

/**
 * @param {HTMLElement} hostEl
 * @param {object|(() => object)} contextOrGetter Store context or legacy flat config getter.
 * @returns {() => void}
 */
export function bindModulaGalleryLightbox(hostEl, contextOrGetter) {
	const resolveContext = () => {
		const value =
			typeof contextOrGetter === 'function'
				? contextOrGetter()
				: contextOrGetter;
		if (value?.config) {
			return {
				config: value.config,
				items: value.items,
				settings: value.settings,
				resolveItems: value.resolveItems,
			};
		}
		return {
			config: value,
			items: undefined,
			settings: undefined,
			resolveItems: undefined,
		};
	};
	const initialContext = resolveContext();
	if (!hostEl || initialContext.config?.lightbox !== 'fancybox') {
		return () => {};
	}

	/** @type {{ link: HTMLElement, at: number }|null} */
	let pendingDoubleOpen = null;
	/** Ignore the compatibility mouse click that follows a handled touchend. */
	let suppressClickUntil = 0;
	const DOUBLE_OPEN_MS_MOUSE = 350;
	const DOUBLE_OPEN_MS_TOUCH = 500;

	function clearPendingDoubleOpen() {
		pendingDoubleOpen = null;
	}

	/**
	 * @param {HTMLElement} link
	 * @param {{ touch?: boolean }} [options]
	 * @returns {boolean} True when this activation should open the lightbox.
	 */
	function consumeDoubleClickGate(link, options = {}) {
		const config = resolveContext().config;
		if (!isDoubleClickToOpenEnabled(config)) {
			clearPendingDoubleOpen();
			return true;
		}
		const touch = Boolean(options.touch);
		const windowMs = touch ? DOUBLE_OPEN_MS_TOUCH : DOUBLE_OPEN_MS_MOUSE;
		const now =
			typeof performance !== 'undefined' ? performance.now() : Date.now();
		if (
			pendingDoubleOpen &&
			pendingDoubleOpen.link === link &&
			now - pendingDoubleOpen.at <= windowMs
		) {
			clearPendingDoubleOpen();
			return true;
		}
		pendingDoubleOpen = { link, at: now };
		window.setTimeout(() => {
			if (pendingDoubleOpen?.link === link) {
				clearPendingDoubleOpen();
			}
		}, windowMs + 50);
		return false;
	}

	/**
	 * @param {Event} event
	 * @param {HTMLElement} link
	 * @returns {boolean}
	 */
	function shouldOpenFromPointerEvent(event, link) {
		const config = resolveContext().config;
		if (!isDoubleClickToOpenEnabled(config)) {
			return true;
		}
		const touch = isTouchLikeActivateEvent(event);
		/*
		 * Mouse: prefer native click.detail (2 on the second click of a double-click).
		 * Touch: detail is always 1 — use a timed double-tap gate with a wider window.
		 */
		if (!touch && typeof event.detail === 'number' && event.detail > 0) {
			clearPendingDoubleOpen();
			return event.detail >= 2;
		}
		return consumeDoubleClickGate(link, { touch });
	}

	function onMouseDown(event) {
		if (event.button !== 0) {
			return;
		}
		/*
		 * preventDefault on touch-derived mousedown often swallows the following
		 * click on mobile — keep it mouse-only (focus-within hover cleanup).
		 */
		if (isTouchLikeActivateEvent(event)) {
			return;
		}
		const link = resolveModulaLightboxClickLink(event, hostEl);
		if (!link) {
			return;
		}
		if (resolveContext().config?.lightbox !== 'fancybox') {
			return;
		}
		event.preventDefault();
	}

	/**
	 * @param {Event} event
	 * @param {{ fromTouchEnd?: boolean, skipDoubleGate?: boolean }} [options]
	 */
	function onActivate(event, options = {}) {
		const target = event.target;
		if (target instanceof Element && target.closest('.modula-selection-handle')) {
			return;
		}
		const link = resolveModulaLightboxClickLink(event, hostEl);
		if (!link) {
			return;
		}
		event.preventDefault();

		const openedViaKeyboard = event.type === 'keydown';
		// Keyboard must open on first Enter/Space (a11y). Double-click gate is pointer-only.
		if (
			!openedViaKeyboard &&
			!options.skipDoubleGate &&
			!shouldOpenFromPointerEvent(event, link)
		) {
			return;
		}

		const context = resolveContext();
		const galleryRoot = hostEl.closest('.modula.modula-gallery');
		if (options.fromTouchEnd) {
			suppressClickUntil =
				(typeof performance !== 'undefined'
					? performance.now()
					: Date.now()) + 700;
		}
		openModulaGalleryLightboxFromClick({
			rootEl: hostEl,
			clickedLink: link,
			config: context.config,
			items: context.items,
			settings: context.settings,
			resolveItems: context.resolveItems,
			openedViaKeyboard,
		}).catch((err) => {
			reportLightboxFailure(galleryRoot || hostEl, err);
		});
	}

	function onClick(event) {
		const now =
			typeof performance !== 'undefined' ? performance.now() : Date.now();
		if (now < suppressClickUntil) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		/*
		 * When double-tap mode is on, touchend owns the gesture so the
		 * compatibility click does not reset / fight the pending tap state.
		 */
		if (
			isTouchLikeActivateEvent(event) &&
			isDoubleClickToOpenEnabled(resolveContext().config)
		) {
			event.preventDefault();
			return;
		}
		onActivate(event);
	}

	function onTouchEnd(event) {
		if (!isDoubleClickToOpenEnabled(resolveContext().config)) {
			return;
		}
		// Multi-touch / remaining fingers — ignore.
		if (event.touches && event.touches.length > 0) {
			return;
		}
		const target = event.target;
		if (target instanceof Element && target.closest('.modula-selection-handle')) {
			return;
		}
		const link = resolveModulaLightboxClickLink(event, hostEl);
		if (!link) {
			return;
		}
		if (resolveContext().config?.lightbox !== 'fancybox') {
			return;
		}

		/*
		 * Claim the gesture so the browser does not zoom / synthesize a late
		 * click that would look like a new first tap.
		 */
		if (event.cancelable) {
			event.preventDefault();
		}

		if (!consumeDoubleClickGate(link, { touch: true })) {
			suppressClickUntil =
				(typeof performance !== 'undefined'
					? performance.now()
					: Date.now()) + 700;
			return;
		}

		onActivate(event, { fromTouchEnd: true, skipDoubleGate: true });
	}

	function onKeyDown(event) {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}
		onActivate(event);
	}

	hostEl.addEventListener('mousedown', onMouseDown);
	hostEl.addEventListener('click', onClick);
	hostEl.addEventListener('touchend', onTouchEnd, { passive: false });
	hostEl.addEventListener('keydown', onKeyDown);
	return () => {
		clearPendingDoubleOpen();
		hostEl.removeEventListener('mousedown', onMouseDown);
		hostEl.removeEventListener('click', onClick);
		hostEl.removeEventListener('touchend', onTouchEnd);
		hostEl.removeEventListener('keydown', onKeyDown);
	};
}
