/**
 * Responsive column count for parallax masonry (same breakpoints as getResponsiveValues).
 *
 * @package
 */

import { useState, useEffect, useMemo } from '@wordpress/element';
import { getResponsiveValues } from '../utils/helpers';

/**
 * @param {Object} config - Gallery flat config
 * @return {number} 1–12
 */
export function useParallaxColumnCount(config) {
	const [viewportTick, setViewportTick] = useState(0);
	useEffect(() => {
		const onResize = () => setViewportTick((t) => t + 1);
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);

	return useMemo(() => {
		const { columns } = getResponsiveValues(config || {});
		const n = parseInt(columns, 10);
		return Math.max(1, Math.min(12, Number.isFinite(n) && n > 0 ? n : 3));
	}, [config, viewportTick]);
}
