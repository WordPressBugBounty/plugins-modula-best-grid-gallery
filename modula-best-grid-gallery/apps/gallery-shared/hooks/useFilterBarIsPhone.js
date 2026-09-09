/**
 * Phone viewport for filter-bar mobile modes (dropdown / collapse).
 * Editor preview follows `config.previewViewport`; frontend follows matchMedia.
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';
import {
	FILTER_BAR_PHONE_MQ,
	isFilterBarPhoneViewport,
} from '../utils/filterBarModel';
import { getForcedPreviewViewport } from '../utils/resolvePreviewViewport';

/**
 * @param {Object|null|undefined} config
 * @param {'desktop'|'tablet'|'mobile'|null|undefined} [previewViewport]
 * @return {boolean}
 */
export function useFilterBarIsPhone(config, previewViewport) {
	const forced =
		previewViewport === 'desktop' ||
		previewViewport === 'tablet' ||
		previewViewport === 'mobile'
			? previewViewport
			: getForcedPreviewViewport(config);
	const [isPhone, setIsPhone] = useState(() =>
		isFilterBarPhoneViewport(config, previewViewport)
	);

	useEffect(() => {
		if (forced) {
			setIsPhone(forced === 'mobile');
			return undefined;
		}
		if (
			typeof window === 'undefined' ||
			typeof window.matchMedia !== 'function'
		) {
			setIsPhone(false);
			return undefined;
		}
		const mql = window.matchMedia(FILTER_BAR_PHONE_MQ);
		const onChange = () => setIsPhone(mql.matches);
		onChange();
		if (typeof mql.addEventListener === 'function') {
			mql.addEventListener('change', onChange);
			return () => mql.removeEventListener('change', onChange);
		}
		mql.addListener(onChange);
		return () => mql.removeListener(onChange);
	}, [forced]);

	return isPhone;
}
