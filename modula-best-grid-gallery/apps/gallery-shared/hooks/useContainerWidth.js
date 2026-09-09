/**
 * Modula Gallery - Container width hook
 *
 * Measures the width of a DOM node with ResizeObserver and returns a callback ref
 * and the current width. Port of react-grid-gallery's useContainerWidth.
 *
 * @package
 */

import { useRef, useCallback, useState } from '@wordpress/element';

/**
 * @param {number} defaultContainerWidth - Initial width (e.g. 0 until measured)
 * @return {{ containerRef: (node: HTMLElement | null) => void, containerWidth: number }}
 */
export function useContainerWidth(defaultContainerWidth = 0) {
	const ref = useRef(null);
	const observerRef = useRef(null);

	const [containerWidth, setContainerWidth] = useState(defaultContainerWidth);

	const commitWidth = useCallback((rawWidth) => {
		const floored = Math.floor(Number(rawWidth) || 0);
		if (floored <= 0) {
			return;
		}
		setContainerWidth((prev) => (prev === floored ? prev : floored));
	}, []);

	const measureNodeWidth = useCallback((node) => {
		if (!node) {
			return 0;
		}
		let width = node.clientWidth;
		try {
			width = node.getBoundingClientRect().width;
		} catch (err) {
			// getBoundingClientRect can throw in rare detached-node cases.
		}
		return Math.floor(Number(width) || 0);
	}, []);

	const measureWidth = useCallback(() => {
		if (!ref.current) {
			return 0;
		}
		let floored = measureNodeWidth(ref.current);
		if (floored > 0) {
			return floored;
		}
		const parent = ref.current.parentElement;
		if (parent) {
			floored = measureNodeWidth(parent);
		}
		return floored > 0 ? floored : 0;
	}, [measureNodeWidth]);

	const containerRef = useCallback(
		(node) => {
			observerRef.current?.disconnect();
			observerRef.current = null;

			ref.current = node;

			if (!node) {
				return;
			}

			const updateWidth = () => {
				const floored = measureWidth();
				if (floored > 0) {
					commitWidth(floored);
					return;
				}
				if (typeof requestAnimationFrame !== 'undefined') {
					requestAnimationFrame(() => {
						const retry = measureWidth();
						if (retry > 0) {
							commitWidth(retry);
						}
					});
				}
			};

			updateWidth();

			if (typeof ResizeObserver !== 'undefined') {
				observerRef.current = new ResizeObserver(() => {
					const floored = measureWidth();
					if (floored > 0) {
						commitWidth(floored);
					}
				});
				observerRef.current.observe(node);
			}
		},
		[commitWidth, measureWidth]
	);

	return { containerRef, containerWidth };
}
