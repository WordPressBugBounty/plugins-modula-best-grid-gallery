/**
 * Legacy inView: add `modula-loaded-scale` on the gallery root when it enters
 * the viewport (jquery-modula parity). Does not mark items `tg-loaded` — that
 * class is reserved for image load completion.
 *
 * @package
 */

import { useEffect } from '@wordpress/element';

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isGalleryRootInViewport(element) {
	const rect = element.getBoundingClientRect();
	const winHeight =
		window.innerHeight || document.documentElement.clientHeight;

	return (
		(rect.top - winHeight <= -100 && rect.top - winHeight >= -400) ||
		rect.bottom <= winHeight ||
		(rect.top < winHeight && rect.bottom > 0)
	);
}

/**
 * @param {import('react').RefObject<HTMLElement|null>} hostRef
 * @param {boolean} enabled
 */
export function useGalleryInView(hostRef, enabled) {
	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const root =
			hostRef.current?.closest('.modula.modula-gallery') ??
			hostRef.current?.closest('.modula-gallery-modern');
		if (!root) {
			return undefined;
		}

		const apply = () => {
			if (isGalleryRootInViewport(root)) {
				root.classList.add('modula-loaded-scale');
			}
		};

		apply();
		window.addEventListener('scroll', apply, { passive: true });
		window.addEventListener('resize', apply, { passive: true });
		window.addEventListener('load', apply);

		return () => {
			window.removeEventListener('scroll', apply);
			window.removeEventListener('resize', apply);
			window.removeEventListener('load', apply);
		};
	}, [hostRef, enabled]);
}
