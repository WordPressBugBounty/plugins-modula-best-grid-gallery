/**
 * Vanilla gallery lightbox helpers (frontend + shared layouts).
 *
 * Prefer `lightboxOpenFacade.js` for bind / open-at-root. This file holds
 * host binding and slide resolution used by that facade.
 *
 * @package
 */
import {
	cancelModulaGalleryLightboxOpen,
	requestModulaLightboxOpen,
} from './lightboxSessionLifecycle';
import { releaseModulaGalleryItemPointerFocus } from './releaseModulaGalleryItemPointerFocus';
import { bindModulaLightboxActivation } from './bindModulaLightboxActivation';
import { buildModulaLightboxSlidesFromItems } from './buildModulaLightboxSlidesFromItems';
import { withDeeplinkHashes } from './modulaDeeplinkFromHash';
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
	buildModulaLightboxVideoPlaybackFields,
	formatVideoPlaybackUrl,
	isProbableModulaVideoPlaybackUrl,
	resolveItemLightboxVideoFlags,
} from '../video/videoGalleryModel';
import { galleryUsesFancyboxLightbox } from '../utils/resolveGalleryItemLink';

/**
 * @param {Object} config
 * @return {boolean}
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
 * @param {Object} [config] Gallery flat config from bootstrap.
 * @return {string}
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
 * @return {HTMLElement[]}
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
 * Whether the event started on a link or button other than the tile's lightbox link.
 *
 * @param {EventTarget|null|undefined} target
 * @param {HTMLElement}                hostEl
 * @return {boolean}
 */
function isOtherTileControlTarget(target, hostEl) {
	if (!(target instanceof Element)) {
		return false;
	}
	const control = target.closest('a, button');
	return (
		Boolean(control) &&
		hostEl.contains(control) &&
		!control.classList.contains('modula-item-link')
	);
}

/**
 * The tile lightbox link under overlay content (caption, share row).
 *
 * The overlay paints above the link; hover-builder slots make its text
 * hit-testable, so those clicks never reach the link itself.
 *
 * @param {Element} node
 * @return {Element|null}
 */
function overlayContentTileLink(node) {
	const tile = node.closest('.modula-item-content')?.closest('.modula-item');
	return (
		tile?.querySelector(
			':scope > .modula-item-link, :scope > .modula-item-image-area > .modula-item-link'
		) ?? null
	);
}

/**
 * Resolve the tile link that should open the lightbox from a pointer/click event.
 * Falls back to elementFromPoint when pointer capture on a parent (Showcase
 * viewport drag) retargets the event away from `.modula-item-link`.
 *
 * Clicks on another control in the tile (inline share icons, caption links,
 * buttons) never resolve: the host listener is native and may run before the
 * control's React handler stops propagation.
 *
 * @param {Event}       event
 * @param {HTMLElement} hostEl
 * @return {HTMLElement|null}
 */
export function resolveModulaLightboxClickLink(event, hostEl) {
	if (!hostEl) {
		return null;
	}
	if (isOtherTileControlTarget(event?.target, hostEl)) {
		return null;
	}
	const fromTarget = (node) => {
		if (!node || !(node instanceof Element)) {
			return null;
		}
		const link =
			node.closest('.modula-item-link') || overlayContentTileLink(node);
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
 * @return {Array<{ src: string, opts: object }>}
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
 * @param {HTMLElement|null|undefined}                                clickedLink
 * @param {Array<{ src?: string, image_id?: string, opts?: object }>} slides
 * @param {HTMLElement|null|undefined}                                rootEl
 * @return {number}
 */
export function resolveLightboxStartIndex(clickedLink, slides, rootEl) {
	if (!clickedLink || slides.length === 0) {
		return 0;
	}

	// Freeform keeps catalog order while duplicate occurrences move independently.
	const occurrence = clickedLink.closest('[data-modula-catalog-index]');
	if (occurrence && rootEl?.contains(occurrence)) {
		const catalogIndex = Number(occurrence.dataset.modulaCatalogIndex);
		const byOccurrence = slides.findIndex(
			(slide) => slide.catalog_index === catalogIndex
		);
		if (byOccurrence >= 0) {
			return byOccurrence;
		}
	}

	// Video item identities are not numeric attachment IDs. Layout columns can
	// reorder DOM nodes, so match the catalog identity before falling back.
	const itemId = clickedLink.getAttribute('data-image-id');
	if (itemId) {
		const byItemId = slides.findIndex((slide) => slide.item_id === itemId);
		if (byItemId >= 0) {
			return byItemId;
		}
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
 * @param {Object}      [config]
 * @return {string}
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
 * @param {Object}      [config]
 * @return {{ src: string, opts: object }|null}
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
	const itemVideoFlags = isVideo
		? {
				loop_video:
					link.getAttribute('data-loop') ||
					link.dataset?.loop ||
					itemEl.getAttribute('data-loop') ||
					'inherit',
				autoplay_lightbox:
					link.getAttribute('data-autolight') ||
					link.dataset?.autolight ||
					itemEl.getAttribute('data-autolight') ||
					'inherit',
			}
		: {};
	const flags = isVideo
		? resolveItemLightboxVideoFlags(itemVideoFlags, videoSettings)
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
	const videoPlayback = isVideo
		? buildModulaLightboxVideoPlaybackFields(flags, videoUrl)
		: null;
	return {
		src: playbackSrc,
		item_id: link.getAttribute('data-image-id') || '',
		image_id: imageIdStr,
		/*
		 * Fancybox Video plugin: slide.autoplay ?? Carousel.Video.autoplay.
		 * Always set explicitly on video slides so item overrides win.
		 */
		...(videoPlayback
			? {
					autoplay: videoPlayback.autoplay,
					modulaVideoLoop: videoPlayback.modulaVideoLoop,
					...(videoPlayback.youtube
						? { youtube: videoPlayback.youtube }
						: {}),
					...(videoPlayback.vimeo
						? { vimeo: videoPlayback.vimeo }
						: {}),
					...(videoPlayback.html5videoTpl
						? { html5videoTpl: videoPlayback.html5videoTpl }
						: {}),
				}
			: {}),
		opts: {
			caption,
			alt: img.getAttribute('alt') || '',
			thumb: poster || playbackSrc,
			...(poster && isVideo ? { poster } : {}),
			image_id: imageIdStr,
			...(videoPlayback
				? {
						modulaVideoAutoplay: videoPlayback.modulaVideoAutoplay,
						modulaVideoLoop: videoPlayback.modulaVideoLoop,
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
 * @param               config
 * @return {Array<{ src: string, opts: object }>}
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
 * @return {Promise<unknown[]|undefined>}
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

/**
 * @param {HTMLElement}                        rootEl
 * @param {Object}                             config
 * @param {number|((slides: Array) => number)} startIndex Resolve a deeplink after its catalog loads; -1 means no match.
 * @param {Object}                             context
 * @return {Promise<boolean>}
 */
export async function openModulaGalleryLightboxAtRoot(
	rootEl,
	config,
	startIndex = 0,
	context = {}
) {
	if (!rootEl || !galleryUsesFancyboxLightbox(config?.lightbox)) {
		return false;
	}
	if (!isModulaLightboxAllowedOnDevice(config)) {
		return false;
	}
	return requestModulaLightboxOpen(rootEl, async () => {
		const items = await resolveLightboxSourceItems(context);
		const slides = withDeeplinkHashes(
			resolveModulaLightboxSlides({
				items,
				settings: context.settings,
				config,
				rootEl,
			}),
			context.catalogItems,
			context.settings,
			config
		);
		if (slides.length === 0) {
			return null;
		}
		const requestedIndex =
			typeof startIndex === 'function' ? startIndex(slides) : startIndex;
		if (typeof startIndex === 'function' && requestedIndex < 0) {
			return null;
		}
		const index = Math.min(Math.max(0, requestedIndex), slides.length - 1);
		return [
			slides,
			config.lightboxOpts || {},
			index,
			{
				settings: context.settings,
				galleryId: config.galleryId,
				galleryComments: config.galleryComments,
				shareButtonsJson: resolveModulaShareButtonsJson(config),
				openedViaKeyboard: Boolean(context.openedViaKeyboard),
				galleryHostEl: rootEl,
			},
		];
	});
}

/**
 * @param {{
 *   rootEl: HTMLElement,
 *   clickedLink: HTMLElement,
 *   config: object,
 *   items?: unknown[],
 *   settings?: object,
 *   resolveItems?: () => Promise<unknown[]>|unknown[],
 *   catalogItems?: unknown[],
 *   openedViaKeyboard?: boolean,
 * }} args
 * @return {Promise<boolean>}
 */
export async function openModulaGalleryLightboxFromClick({
	rootEl,
	clickedLink,
	config,
	items,
	settings,
	resolveItems,
	catalogItems,
	openedViaKeyboard = false,
}) {
	if (
		!rootEl ||
		!clickedLink ||
		!galleryUsesFancyboxLightbox(config?.lightbox)
	) {
		return false;
	}
	if (!isModulaLightboxAllowedOnDevice(config)) {
		return false;
	}

	return requestModulaLightboxOpen(rootEl, async () => {
		const sourceItems = await resolveLightboxSourceItems({
			items,
			resolveItems,
		});
		const slides = withDeeplinkHashes(
			resolveModulaLightboxSlides({
				items: sourceItems,
				settings,
				config,
				rootEl,
			}),
			catalogItems,
			settings,
			config
		);
		if (slides.length === 0) {
			return null;
		}

		const index = resolveLightboxStartIndex(clickedLink, slides, rootEl);
		const clickedTileEl =
			clickedLink.closest('.modula-item.modula-hover-v2') ||
			clickedLink.closest('.modula-item');

		if (!openedViaKeyboard) {
			releaseModulaGalleryItemPointerFocus(clickedLink);
		}

		return [
			slides,
			config.lightboxOpts || {},
			index,
			{
				settings,
				galleryId: config.galleryId,
				galleryComments: config.galleryComments,
				shareButtonsJson: resolveModulaShareButtonsJson(config),
				openedViaKeyboard,
				triggerEl: clickedLink,
				galleryHostEl: rootEl,
				clickedTileEl,
			},
		];
	});
}

/**
 * @param {HTMLElement}           hostEl
 * @param {object|(() => object)} contextOrGetter Store context or legacy flat config getter.
 * @return {() => void}
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
				catalogItems: value.catalogItems,
			};
		}
		return {
			config: value,
			items: undefined,
			settings: undefined,
			resolveItems: undefined,
			catalogItems: undefined,
		};
	};
	const initialContext = resolveContext();
	if (
		!hostEl ||
		!galleryUsesFancyboxLightbox(initialContext.config?.lightbox)
	) {
		return () => {};
	}

	const unbindActivation = bindModulaLightboxActivation(hostEl, {
		config: () => resolveContext().config,
		resolveLink: (event) => resolveModulaLightboxClickLink(event, hostEl),
		activate: (link, { openedViaKeyboard }) => {
			const context = resolveContext();
			openModulaGalleryLightboxFromClick({
				rootEl: hostEl,
				clickedLink: link,
				config: context.config,
				items: context.items,
				settings: context.settings,
				resolveItems: context.resolveItems,
				catalogItems: context.catalogItems,
				openedViaKeyboard,
			});
		},
	});
	return () => {
		cancelModulaGalleryLightboxOpen(hostEl);
		unbindActivation();
	};
}
