/**
 * The Motion tab's "This layout" options, for the visitor gallery and the
 * editor preview: Justified "Widen on hover" (motion/widenOnHover.js) and
 * Polaroid "Visitors can move the prints" (motion/movePrints.js). Each runs
 * while its option is on (`config.widenOnHover`, `config.movePrints`) and the
 * gallery's motion may play (useGalleryMotionAllowed).
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { getMotionSpeedScale } from '../motion/motionRuntime';
import { letVisitorsMovePrints } from '../motion/movePrints';
import { widenJustifiedRows } from '../motion/widenOnHover';

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {Object}                                      settings      Grouped settings.
 * @param {Object}                                      config
 * @param {boolean}                                     motionAllowed The gallery's motion may play.
 */
export function useLayoutMotion(hostRef, settings, config, motionAllowed) {
	const widens = motionAllowed && config?.widenOnHover === true;
	const speedScale = getMotionSpeedScale(settings?.motion?.speed);
	useEffect(() => {
		const host = hostRef.current;
		if (!host || !widens) {
			return undefined;
		}
		return widenJustifiedRows(host, speedScale);
	}, [hostRef, widens, speedScale]);

	const movesPrints = motionAllowed && config?.movePrints === true;
	useEffect(() => {
		const host = hostRef.current;
		if (!host || !movesPrints) {
			return undefined;
		}
		return letVisitorsMovePrints(host);
	}, [hostRef, movesPrints]);
}
