/**
 * Open Modula Fancybox from URL hash on modern React galleries.
 *
 * @package
 */
import { useEffect, useRef } from '@wordpress/element';
import {
	matchDeeplinkHashForGallery,
	resolveDeeplinkStartIndex,
	resolveDeeplinkTargetItemId,
	resolveGalleryIdFromRoot,
} from './modulaDeeplinkFromHash';
import {
	cancelModulaGalleryLightboxOpen,
	openModulaGalleryLightboxAtRoot,
} from './lightboxOpenFacade';
import { galleryUsesFancyboxLightbox } from '../utils/resolveGalleryItemLink';

/**
 * @param {HTMLElement|null} hostEl React host (display:contents) or gallery root.
 * @return {HTMLElement|null}
 */
function resolveGalleryRoot(hostEl) {
	if (!(hostEl instanceof HTMLElement)) {
		return null;
	}
	return (
		hostEl.closest('.modula.modula-gallery') ||
		hostEl.closest('.modula-gallery-modern') ||
		hostEl
	);
}

/**
 * Prefer store items for deeplink slides; retry briefly if the first paint races
 * an empty list (avoids silent DOM-only image slides for video tiles).
 *
 * @param {unknown[]}                          items
 * @param {() => Promise<unknown[]>|unknown[]} [resolveItems]
 * @return {Promise<unknown[]>}
 */
async function resolveDeeplinkSourceItems(items, resolveItems) {
	const attempt = async () => {
		if (typeof resolveItems === 'function') {
			try {
				const resolved = await resolveItems();
				if (Array.isArray(resolved) && resolved.length > 0) {
					return resolved;
				}
			} catch {
				// Fall through to `items`.
			}
		}
		return Array.isArray(items) ? items : [];
	};

	let sourceItems = await attempt();
	if (sourceItems.length > 0) {
		return sourceItems;
	}

	await new Promise((resolve) => {
		setTimeout(resolve, 50);
	});
	sourceItems = await attempt();
	if (sourceItems.length > 0) {
		return sourceItems;
	}

	await new Promise((resolve) => {
		setTimeout(resolve, 150);
	});
	return attempt();
}

/**
 * @param {HTMLElement}                        rootEl
 * @param {Object}                             config
 * @param {Object}                             settings
 * @param {unknown[]}                          items
 * @param {() => Promise<unknown[]>|unknown[]} [resolveItems]
 * @param {string}                             [hash]
 * @param {unknown[]}                          [catalogItems] All gallery rows, unfiltered.
 * @return {Promise<boolean>} Whether the lightbox opened.
 */
async function openGalleryFromDeeplinkHash(
	rootEl,
	config,
	settings,
	items,
	resolveItems,
	hash,
	catalogItems
) {
	const matched = matchDeeplinkHashForGallery(rootEl, settings, config, hash);
	if (!matched) {
		return false;
	}
	if (!galleryUsesFancyboxLightbox(config?.lightbox)) {
		return false;
	}

	// The hash index counts the full gallery, not the filtered view.
	const targetItemId = resolveDeeplinkTargetItemId(
		matched.imageRef,
		catalogItems,
		config
	);
	const startIndex = (slides) =>
		resolveDeeplinkStartIndex(matched.imageRef, slides, targetItemId);

	const openedInView = await openModulaGalleryLightboxAtRoot(
		rootEl,
		config,
		startIndex,
		{
			resolveItems: () => resolveDeeplinkSourceItems(items, resolveItems),
			settings,
			catalogItems,
		}
	);
	if (openedInView || !targetItemId) {
		return openedInView;
	}

	// The active filter hides the linked image: show it over the whole gallery.
	return openModulaGalleryLightboxAtRoot(rootEl, config, startIndex, {
		resolveItems: () => catalogItems,
		settings,
		catalogItems,
	});
}

/**
 * Open lightbox when URL hash matches this gallery (mount + hashchange).
 *
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {Object}                                      config
 * @param {Object}                                      [options]
 * @param {boolean}                                     [options.enabled]
 * @param {unknown[]}                                   [options.items]
 * @param {Object}                                      [options.settings]
 * @param {() => Promise<unknown[]>|unknown[]}          [options.resolveItems]
 * @param {unknown[]}                                   [options.catalogItems] All gallery rows, unfiltered.
 */
export function useModulaGalleryDeeplink(hostRef, config, options = {}) {
	const enabled = options.enabled !== false;
	const itemsRef = useRef(options.items);
	const settingsRef = useRef(options.settings);
	const resolveItemsRef = useRef(options.resolveItems);
	const catalogItemsRef = useRef(options.catalogItems);
	const configRef = useRef(config);

	itemsRef.current = options.items;
	settingsRef.current = options.settings;
	resolveItemsRef.current = options.resolveItems;
	catalogItemsRef.current = options.catalogItems;
	configRef.current = config;

	useEffect(() => {
		if (
			!enabled ||
			!galleryUsesFancyboxLightbox(configRef.current?.lightbox)
		) {
			return undefined;
		}

		const host = hostRef.current;
		const rootEl = resolveGalleryRoot(host);
		if (!rootEl || !resolveGalleryIdFromRoot(rootEl)) {
			return undefined;
		}

		let opening = false;
		const tryOpen = async (hash = window.location.hash) => {
			if (opening) {
				return;
			}
			opening = true;
			try {
				await openGalleryFromDeeplinkHash(
					rootEl,
					configRef.current,
					settingsRef.current,
					itemsRef.current,
					resolveItemsRef.current,
					hash,
					catalogItemsRef.current
				);
			} finally {
				opening = false;
			}
		};

		// After paint so tiles / store slides are ready.
		const frame = requestAnimationFrame(() => {
			void tryOpen();
		});

		/*
		 * Open after the other hashchange listeners. Fancybox's Hash plugin also
		 * listens, and when it finds a lightbox already open it moves to the hash
		 * number as a position in the opened (possibly filtered) slides.
		 */
		let hashChangeTimer = 0;
		const onHashChange = () => {
			clearTimeout(hashChangeTimer);
			hashChangeTimer = setTimeout(() => {
				void tryOpen();
			}, 0);
		};
		window.addEventListener('hashchange', onHashChange);

		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(hashChangeTimer);
			window.removeEventListener('hashchange', onHashChange);
			cancelModulaGalleryLightboxOpen(rootEl);
		};
	}, [
		enabled,
		hostRef,
		config?.lightbox,
		config?.lightboxOpts,
		config?.galleryId,
		options.items,
		options.settings,
		options.resolveItems,
		options.catalogItems,
	]);
}
