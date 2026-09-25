/**
 * Drag-to-scroll for the Beta Video playlist strip when the scrollbar is hidden.
 *
 * @package
 */

import { useEffect } from '@wordpress/element';
import { attachPlaylistDragScroll } from '../video/playlistDragScroll';

/**
 * @param {import('react').RefObject<HTMLElement|null>} ref             Overflow strip element.
 * @param {Object}                                      options
 * @param {boolean}                                     options.enabled
 * @param {'x'|'y'}                                     options.axis
 */
export default function usePlaylistDragScroll(ref, { enabled, axis }) {
	useEffect(() => {
		const el = ref.current;
		if (!el || !enabled) {
			return undefined;
		}
		return attachPlaylistDragScroll(el, { axis });
	}, [ref, enabled, axis]);
}
