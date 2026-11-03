/**
 * Whether the gallery's motion may play here and now (entrance, hover moves,
 * Widen on hover, moving the prints). It never plays for a visitor whose
 * device asks for less motion (utils/reducedMotion.js), and not on a phone
 * while Animate on phones (`motion.phones`) is off.
 *
 * "A phone" is the gallery's own "Treat as a phone under" breakpoint
 * (`responsive.treatAsPhoneUnder`, 600px by default) against the window, for
 * every layout; the editor preview's device viewport wins. The window is
 * watched only while Animate on phones is off, so a resize or rotation across
 * the breakpoint starts or stops the motion.
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';
import { shouldSuppressGalleryMotion } from '../utils/reducedMotion';
import {
	getForcedPreviewViewport,
	getMasonryMobileMq,
} from '../utils/resolvePreviewViewport';

/**
 * @param {string} query Media query.
 * @return {boolean} The window matches it now.
 */
function windowMatches(query) {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia(query).matches
	);
}

/**
 * @param {Object|null|undefined} config
 * @param {boolean}               watch  Follow the window's width.
 * @return {boolean} The gallery shows on a phone.
 */
function useGalleryOnPhone(config, watch) {
	const forced = getForcedPreviewViewport(config);
	const phoneQuery = getMasonryMobileMq(config);
	const [windowIsPhone, setWindowIsPhone] = useState(() =>
		windowMatches(phoneQuery)
	);

	useEffect(() => {
		if (
			!watch ||
			forced ||
			typeof window === 'undefined' ||
			typeof window.matchMedia !== 'function'
		) {
			return undefined;
		}
		const mql = window.matchMedia(phoneQuery);
		const onChange = () => setWindowIsPhone(mql.matches);
		onChange();
		if (typeof mql.addEventListener === 'function') {
			mql.addEventListener('change', onChange);
			return () => mql.removeEventListener('change', onChange);
		}
		mql.addListener(onChange);
		return () => mql.removeListener(onChange);
	}, [watch, forced, phoneQuery]);

	return forced ? forced === 'mobile' : windowIsPhone;
}

/**
 * @param {Object|null|undefined}                      settings Grouped settings.
 * @param {Object|null|undefined}                      config
 * @param {{ displayContext?: string }|null|undefined} metadata
 * @return {boolean} The gallery's motion may play.
 */
export function useGalleryMotionAllowed(settings, config, metadata) {
	const stillOnPhones = settings?.motion?.phones === false;
	const onPhone = useGalleryOnPhone(config, stillOnPhones);
	if (shouldSuppressGalleryMotion(metadata)) {
		return false;
	}
	return !(stillOnPhones && onPhone);
}
