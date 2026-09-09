/**
 * Open Modula Fancybox from URL hash on modern React galleries.
 *
 * @package
 */
import { useEffect, useRef } from '@wordpress/element';
import {
	matchDeeplinkHashForGallery,
	resolveDeeplinkStartIndex,
	resolveGalleryIdFromRoot,
} from './modulaDeeplinkFromHash';
import { openModulaGalleryLightboxAtRoot } from './lightboxOpenFacade';
import { resolveModulaLightboxSlides } from './modulaGalleryLightbox';

/**
 * @param {HTMLElement|null} hostEl React host (display:contents) or gallery root.
 * @returns {HTMLElement|null}
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
 * @param {unknown[]} items
 * @param {() => Promise<unknown[]>|unknown[]} [resolveItems]
 * @returns {Promise<unknown[]>}
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
 * @param {HTMLElement} rootEl
 * @param {object} config
 * @param {object} settings
 * @param {unknown[]} items
 * @param {() => Promise<unknown[]>|unknown[]} [resolveItems]
 * @param {string} [hash]
 * @returns {Promise<boolean>}
 */
async function openGalleryFromDeeplinkHash(
	rootEl,
	config,
	settings,
	items,
	resolveItems,
	hash
) {
	const matched = matchDeeplinkHashForGallery(rootEl, settings, config, hash);
	if (!matched) {
		return false;
	}
	if (config?.lightbox !== 'fancybox') {
		return false;
	}

	const sourceItems = await resolveDeeplinkSourceItems(items, resolveItems);
	const slides = resolveModulaLightboxSlides({
		items: sourceItems,
		settings,
		config,
		rootEl,
	});
	const startIndex = resolveDeeplinkStartIndex(matched.imageRef, slides);
	if (startIndex < 0) {
		return false;
	}

	return openModulaGalleryLightboxAtRoot(rootEl, config, startIndex, {
		items: sourceItems,
		settings,
	});
}

/**
 * Open lightbox when URL hash matches this gallery (mount + hashchange).
 *
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {object} config
 * @param {object} [options]
 * @param {boolean} [options.enabled]
 * @param {unknown[]} [options.items]
 * @param {object} [options.settings]
 * @param {() => Promise<unknown[]>|unknown[]} [options.resolveItems]
 */
export function useModulaGalleryDeeplink(hostRef, config, options = {}) {
	const enabled = options.enabled !== false;
	const itemsRef = useRef(options.items);
	const settingsRef = useRef(options.settings);
	const resolveItemsRef = useRef(options.resolveItems);
	const configRef = useRef(config);
	const openingRef = useRef(false);

	itemsRef.current = options.items;
	settingsRef.current = options.settings;
	resolveItemsRef.current = options.resolveItems;
	configRef.current = config;

	useEffect(() => {
		if (!enabled || configRef.current?.lightbox !== 'fancybox') {
			return undefined;
		}

		const host = hostRef.current;
		const rootEl = resolveGalleryRoot(host);
		if (!rootEl || !resolveGalleryIdFromRoot(rootEl)) {
			return undefined;
		}

		const tryOpen = async (hash = window.location.hash) => {
			if (openingRef.current) {
				return;
			}
			openingRef.current = true;
			try {
				await openGalleryFromDeeplinkHash(
					rootEl,
					configRef.current,
					settingsRef.current,
					itemsRef.current,
					resolveItemsRef.current,
					hash
				);
			} finally {
				openingRef.current = false;
			}
		};

		// After paint so tiles / store slides are ready.
		const frame = requestAnimationFrame(() => {
			void tryOpen();
		});

		const onHashChange = () => {
			void tryOpen();
		};
		window.addEventListener('hashchange', onHashChange);

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('hashchange', onHashChange);
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
	]);
}
