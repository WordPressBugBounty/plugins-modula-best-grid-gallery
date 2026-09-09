/**
 * Resolve template layout viewport for CSS modifiers.
 * Editor preview uses `config.previewViewport`; frontend uses matchMedia.
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';
import {
	getForcedPreviewViewport,
	getMasonryMobileMq,
	getMasonryTabletMq,
} from '../../utils/resolvePreviewViewport';

/** @typedef {'desktop'|'tablet'|'mobile'} TemplateViewport */

/**
 * @param {Object|null|undefined} config
 * @return {TemplateViewport}
 */
function resolveTemplateViewportFromWindow(config) {
	if (typeof window === 'undefined') {
		return 'desktop';
	}
	try {
		if (window.matchMedia(getMasonryMobileMq(config)).matches) {
			return 'mobile';
		}
		if (window.matchMedia(getMasonryTabletMq(config)).matches) {
			return 'tablet';
		}
	} catch {
		// ignore
	}
	return 'desktop';
}

/**
 * @param {Object|null|undefined} config
 * @return {TemplateViewport}
 */
export function useTemplateViewport(config) {
	const forced = getForcedPreviewViewport(config);
	const [fromWindow, setFromWindow] = useState(
		/** @type {TemplateViewport} */ ('desktop')
	);

	useEffect(() => {
		if (forced) {
			return undefined;
		}
		const sync = () => {
			setFromWindow(resolveTemplateViewportFromWindow(config));
		};
		sync();
		const mobileMq = window.matchMedia(getMasonryMobileMq(config));
		const tabletMq = window.matchMedia(getMasonryTabletMq(config));
		mobileMq.addEventListener('change', sync);
		tabletMq.addEventListener('change', sync);
		return () => {
			mobileMq.removeEventListener('change', sync);
			tabletMq.removeEventListener('change', sync);
		};
	}, [forced, config?.treatAsPhoneUnder, config?.treatAsTabletUnder]);

	return forced || fromWindow;
}
