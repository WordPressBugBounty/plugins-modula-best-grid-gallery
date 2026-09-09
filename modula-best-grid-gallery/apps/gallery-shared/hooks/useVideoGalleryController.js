/**
 * Video gallery playlist state: active index, select, auto-advance.
 *
 * @package
 */

import { useCallback, useRef, useState } from '@wordpress/element';

/**
 * @param {number} itemCount
 * @return {{
 *   activeIndex: number,
 *   select: (index: number) => void,
 *   playNext: () => void,
 *   userHasInteracted: boolean,
 *   markUserInteracted: () => void,
 * }}
 */
export function useVideoGalleryController(itemCount) {
	const [activeIndex, setActiveIndex] = useState(0);
	const userInteractedRef = useRef(false);
	const [userHasInteracted, setUserHasInteracted] = useState(false);

	const markUserInteracted = useCallback(() => {
		if (!userInteractedRef.current) {
			userInteractedRef.current = true;
			setUserHasInteracted(true);
		}
	}, []);

	const select = useCallback(
		(index) => {
			if (itemCount <= 0) {
				return;
			}
			const next = Math.min(Math.max(0, index), itemCount - 1);
			setActiveIndex(next);
		},
		[itemCount]
	);

	const playNext = useCallback(() => {
		if (itemCount <= 0) {
			return;
		}
		setActiveIndex((prev) => (prev + 1 >= itemCount ? 0 : prev + 1));
	}, [itemCount]);

	return {
		activeIndex: itemCount > 0 ? Math.min(activeIndex, itemCount - 1) : 0,
		select,
		playNext,
		userHasInteracted,
		markUserInteracted,
	};
}
