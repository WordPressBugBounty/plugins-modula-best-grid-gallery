/**
 * Attach vanilla Fancybox open handlers to a gallery React host.
 * Part of the lightbox open facade bind surface (`lightboxOpenFacade.js`).
 *
 * @package
 */
import { useEffect, useRef } from '@wordpress/element';
import { bindModulaGalleryLightbox } from './modulaGalleryLightbox';

/**
 * @param {object} config Gallery config from store.
 * @param {object} [options]
 * @param {boolean} [options.enabled]
 * @param {unknown[]} [options.items] Display items from Redux (filtered or full).
 * @param {object} [options.settings] Grouped gallery settings.
 * @param {() => Promise<unknown[]>|unknown[]} [options.resolveItems] Async lightbox catalog resolver.
 * @returns {import('react').RefObject<HTMLDivElement|null>}
 */
export function useModulaGalleryLightbox(config, options = {}) {
	const hostRef = useRef(null);
	const configRef = useRef(config);
	const itemsRef = useRef(options.items);
	const settingsRef = useRef(options.settings);
	const resolveItemsRef = useRef(options.resolveItems);
	configRef.current = config;
	itemsRef.current = options.items;
	settingsRef.current = options.settings;
	resolveItemsRef.current = options.resolveItems;
	const enabled = options.enabled !== false;

	useEffect(() => {
		if (!enabled || configRef.current?.lightbox !== 'fancybox') {
			return undefined;
		}
		const host = hostRef.current;
		if (!host) {
			return undefined;
		}
		return bindModulaGalleryLightbox(host, () => ({
			config: configRef.current,
			items: itemsRef.current,
			settings: settingsRef.current,
			resolveItems: resolveItemsRef.current,
		}));
	}, [
		enabled,
		config?.lightbox,
		config?.lightboxOpts,
		config?.lightbox_devices,
		config?.lightboxDevices,
		config?.doubleClick,
		config?.mobileDoubleClick,
		config?.showOnLightbox,
		config?.imageLicensing,
		config?.imageLicensingExtensionActive,
		config?.licenseCatalog,
		options.items,
		options.settings,
		options.resolveItems,
	]);

	return hostRef;
}
