/**
 * Hover card treatments that follow the pointer (Tilt, Pan), for the visitor
 * gallery, the editor preview and the hover builder's preview card
 * (motion/hoverPointer.js).
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { followHoverPointer } from '../motion/hoverPointer';

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {boolean}                                     enabled Whether the host's items follow the pointer now.
 */
export function useHoverPointer(hostRef, enabled) {
	useEffect(() => {
		const host = hostRef.current;
		if (!host || !enabled) {
			return undefined;
		}
		return followHoverPointer(host);
	}, [hostRef, enabled]);
}
