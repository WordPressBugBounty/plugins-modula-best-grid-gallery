/**
 * Width of the browser viewport, kept current as the window resizes. For
 * breakpoints that follow the visitor's device and not the width of the
 * column the gallery sits in.
 *
 * @package
 */

import { useEffect, useState } from '@wordpress/element';

/**
 * @return {number} Viewport width in px; 0 where there is no document.
 */
function readViewportWidth() {
	return typeof document === 'undefined'
		? 0
		: document.documentElement.clientWidth;
}

/**
 * @return {number} Viewport width in px; 0 where there is no document.
 */
export function useViewportWidth() {
	const [viewportWidth, setViewportWidth] = useState(readViewportWidth);

	useEffect(() => {
		const onResize = () => setViewportWidth(readViewportWidth());
		onResize();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	return viewportWidth;
}
