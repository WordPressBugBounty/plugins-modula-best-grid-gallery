/**
 * Measure a tile slot for focal-crop pixel math (uniform grid, fillSlot layouts).
 *
 * @package
 */

import { useCallback, useRef, useState } from '@wordpress/element';

/**
 * @param {boolean} enabled
 * @return {{ slotRef: (node: HTMLElement|null) => void, slotWidth: number, slotHeight: number }}
 */
export function useSlotDimensions(enabled) {
	const observerRef = useRef(null);
	const nodeRef = useRef(null);
	const rafRef = useRef(0);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

	const commit = useCallback((width, height) => {
		const w = Math.floor(Number(width) || 0);
		const h = Math.floor(Number(height) || 0);
		if (w <= 0 || h <= 0) {
			return;
		}
		setDimensions((prev) =>
			prev.width === w && prev.height === h ? prev : { width: w, height: h }
		);
	}, []);

	const measure = useCallback(
		(node) => {
			if (!node) {
				return;
			}
			const rect = node.getBoundingClientRect();
			commit(rect.width, rect.height);
		},
		[commit]
	);

	const slotRef = useCallback(
		(node) => {
			observerRef.current?.disconnect();
			observerRef.current = null;
			if (rafRef.current && typeof cancelAnimationFrame !== 'undefined') {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = 0;
			}
			nodeRef.current = node;

			if (!enabled || !node) {
				return;
			}

			/*
			 * Defer the first measure out of commitAttachRef. Sync setState from
			 * a callback ref nests updates when parents re-render and recompose refs
			 * (BnB fillSlot + preview viewport changes → Maximum update depth).
			 */
			const runMeasure = () => {
				rafRef.current = 0;
				if (nodeRef.current !== node) {
					return;
				}
				measure(node);
			};
			if (typeof requestAnimationFrame !== 'undefined') {
				rafRef.current = requestAnimationFrame(runMeasure);
			} else {
				runMeasure();
			}

			if (typeof ResizeObserver === 'undefined') {
				return;
			}

			const observer = new ResizeObserver(() => {
				measure(node);
			});
			observer.observe(node);
			observerRef.current = observer;
		},
		[enabled, measure]
	);

	return {
		slotRef,
		slotWidth: dimensions.width,
		slotHeight: dimensions.height,
	};
}
