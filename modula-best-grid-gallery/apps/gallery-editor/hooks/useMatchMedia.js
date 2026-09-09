import { useEffect, useState } from '@wordpress/element';

/**
 * @param {string} query CSS media query, e.g. `(min-width: 1025px)`.
 * @param {boolean} [ssrFallback=true] Value when `window.matchMedia` is unavailable.
 * @return {boolean}
 */
export function useMatchMedia(query, ssrFallback = true) {
	const [matches, setMatches] = useState(() => {
		if (
			typeof window === 'undefined' ||
			typeof window.matchMedia !== 'function'
		) {
			return ssrFallback;
		}
		return window.matchMedia(query).matches;
	});

	useEffect(() => {
		if (
			typeof window === 'undefined' ||
			typeof window.matchMedia !== 'function'
		) {
			return undefined;
		}

		const media = window.matchMedia(query);
		const onChange = (event) => {
			setMatches(event.matches);
		};

		setMatches(media.matches);
		media.addEventListener('change', onChange);
		return () => {
			media.removeEventListener('change', onChange);
		};
	}, [query]);

	return matches;
}
