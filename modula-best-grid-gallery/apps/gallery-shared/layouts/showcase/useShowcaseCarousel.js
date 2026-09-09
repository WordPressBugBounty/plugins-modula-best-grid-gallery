/**
 * Showcase carousel: index, drag/swipe, keyboard, autoplay, resize.
 * Infinite mode uses a free-running trackIndex across cloned copies.
 *
 * @package
 */

import { useCallback, useEffect, useRef, useState } from '@wordpress/element';

/**
 * @param {object} opts
 * @param {number} opts.itemCount
 * @param {boolean} [opts.autoplay]
 * @param {number} [opts.autoplayInterval]
 * @param {boolean} [opts.enabled]
 * @param {boolean} [opts.infinite]
 * @returns {{
 *   activeIndex: number,
 *   trackIndex: number,
 *   setActiveIndex: (i: number) => void,
 *   goPrev: () => void,
 *   goNext: () => void,
 *   suppressTransition: boolean,
 *   onTransitionEnd: () => void,
 *   viewportRef: import('react').RefObject<HTMLElement|null>,
 *   viewportWidth: number,
 *   dragOffset: number,
 *   isDragging: boolean,
 *   onPointerDown: (e: PointerEvent) => void,
 *   onPointerMove: (e: PointerEvent) => void,
 *   onPointerUp: (e: PointerEvent) => void,
 *   didDragRef: object,
 * }}
 */
export function useShowcaseCarousel({
	itemCount,
	autoplay = false,
	autoplayInterval = 4000,
	enabled = true,
	infinite = false,
}) {
	const n = Math.max(0, itemCount | 0);
	const loop = infinite && n >= 2;
	/*
	 * Middle copy starts at index `n` so prev/next can animate into clones
	 * before snapping back without a visible jump.
	 */
	const [trackIndex, setTrackIndex] = useState(() => (loop ? n : 0));
	const [suppressTransition, setSuppressTransition] = useState(false);
	const [viewportWidth, setViewportWidth] = useState(0);
	const [dragOffset, setDragOffset] = useState(0);
	const [isDragging, setIsDragging] = useState(false);
	const viewportRef = useRef(null);
	const dragRef = useRef({
		active: false,
		pointerId: null,
		startX: 0,
		lastX: 0,
		moved: false,
	});
	const trackRef = useRef(trackIndex);
	trackRef.current = trackIndex;
	const nRef = useRef(n);
	nRef.current = n;
	const loopRef = useRef(loop);
	loopRef.current = loop;

	const activeIndex = n > 0 ? ((trackIndex % n) + n) % n : 0;

	useEffect(() => {
		if (n <= 0) {
			setTrackIndex(0);
			return;
		}
		if (loop) {
			setTrackIndex((i) => {
				const logical = ((i % n) + n) % n;
				return n + logical;
			});
			return;
		}
		setTrackIndex((i) => Math.min(Math.max(0, i), n - 1));
	}, [n, loop]);

	useEffect(() => {
		const el = viewportRef.current;
		if (!el || typeof ResizeObserver === 'undefined') {
			return undefined;
		}
		const ro = new ResizeObserver((entries) => {
			const w = entries[0]?.contentRect?.width;
			if (Number.isFinite(w)) {
				setViewportWidth(Math.round(w));
			}
		});
		ro.observe(el);
		setViewportWidth(Math.round(el.getBoundingClientRect().width));
		return () => ro.disconnect();
	}, []);

	const goToTrack = useCallback((next) => {
		setTrackIndex(next);
	}, []);

	const goPrev = useCallback(() => {
		const count = nRef.current;
		if (count <= 0) {
			return;
		}
		if (loopRef.current) {
			goToTrack(trackRef.current - 1);
			return;
		}
		goToTrack(Math.max(0, trackRef.current - 1));
	}, [goToTrack]);

	const goNext = useCallback(() => {
		const count = nRef.current;
		if (count <= 0) {
			return;
		}
		if (loopRef.current) {
			goToTrack(trackRef.current + 1);
			return;
		}
		goToTrack(Math.min(count - 1, trackRef.current + 1));
	}, [goToTrack]);

	const setActiveIndex = useCallback(
		(i) => {
			if (n <= 0) {
				return;
			}
			const logical = ((i % n) + n) % n;
			if (loop) {
				/*
				 * Jump within the middle copy so clicking a neighbor animates
				 * the shortest path when possible.
				 */
				const base = n;
				const cur = trackRef.current;
				const curLogical = ((cur % n) + n) % n;
				let delta = logical - curLogical;
				if (delta > n / 2) {
					delta -= n;
				} else if (delta < -n / 2) {
					delta += n;
				}
				goToTrack(cur + delta);
				return;
			}
			goToTrack(logical);
		},
		[n, loop, goToTrack]
	);

	const onTransitionEnd = useCallback(() => {
		if (!loopRef.current) {
			return;
		}
		const count = nRef.current;
		if (count < 2) {
			return;
		}
		const i = trackRef.current;
		if (i >= count && i < count * 2) {
			return;
		}
		const logical = ((i % count) + count) % count;
		const snapped = count + logical;
		if (snapped === i) {
			return;
		}
		/*
		 * Silent wrap to the middle clone. Suppress track + slide transitions
		 * so is-active moving between clone nodes does not flash a scale tween.
		 */
		setSuppressTransition(true);
		setTrackIndex(snapped);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				setSuppressTransition(false);
			});
		});
	}, []);

	useEffect(() => {
		if (!enabled || !autoplay || n < 2) {
			return undefined;
		}
		const ms = Math.max(1500, Number(autoplayInterval) || 4000);
		const id = window.setInterval(() => {
			if (dragRef.current.active) {
				return;
			}
			goNext();
		}, ms);
		return () => window.clearInterval(id);
	}, [autoplay, autoplayInterval, enabled, goNext, n]);

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		const onKey = (e) => {
			const host = viewportRef.current;
			if (!host) {
				return;
			}
			const root = host.closest('.modula') || host;
			if (
				!root.contains(document.activeElement) &&
				document.activeElement !== host
			) {
				if (!root.contains(e.target)) {
					return;
				}
			}
			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				goPrev();
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				goNext();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [enabled, goNext, goPrev]);

	const onPointerDown = useCallback(
		(e) => {
			if (!enabled || e.button === 2) {
				return;
			}
			const target = e.target;
			if (
				target instanceof Element &&
				target.closest(
					'.modula-social-expandable, .modula-social-expandable-icons, .figc .modula-social, .modula-showcase__arrow'
				)
			) {
				return;
			}
			dragRef.current = {
				active: true,
				pointerId: e.pointerId,
				startX: e.clientX,
				lastX: e.clientX,
				moved: false,
				captured: false,
			};
			/*
			 * Do not setPointerCapture / isDragging until the pointer moves —
			 * capturing on pointerdown retargets the following click away from
			 * `.modula-item-link` and blocks the lightbox open facade.
			 */
		},
		[enabled]
	);

	const onPointerMove = useCallback((e) => {
		const d = dragRef.current;
		if (!d.active || d.pointerId !== e.pointerId) {
			return;
		}
		const dx = e.clientX - d.startX;
		if (Math.abs(dx) > 6) {
			d.moved = true;
			if (!d.captured) {
				d.captured = true;
				setIsDragging(true);
				try {
					e.currentTarget.setPointerCapture(e.pointerId);
				} catch {
					/* ignore */
				}
			}
		}
		d.lastX = e.clientX;
		setDragOffset(dx);
	}, []);

	const onPointerUp = useCallback(
		(e) => {
			const d = dragRef.current;
			if (!d.active || d.pointerId !== e.pointerId) {
				return;
			}
			const dx = e.clientX - d.startX;
			const threshold = Math.max(40, (viewportWidth || 320) * 0.12);
			const moved = d.moved;
			dragRef.current = {
				active: false,
				pointerId: null,
				startX: 0,
				lastX: 0,
				moved,
				captured: false,
			};
			setIsDragging(false);
			setDragOffset(0);
			if (d.captured) {
				try {
					e.currentTarget.releasePointerCapture(e.pointerId);
				} catch {
					/* ignore */
				}
			}
			/*
			 * Drag/pointer on a slide button leaves :focus with a browser
			 * outline — blur so the black ring does not stick after swipe.
			 */
			if (moved) {
				const focused = document.activeElement;
				const host = viewportRef.current;
				if (
					focused &&
					host &&
					focused !== host &&
					host.contains(focused) &&
					typeof focused.blur === 'function'
				) {
					focused.blur();
				}
			}
			if (Math.abs(dx) >= threshold) {
				if (dx < 0) {
					goNext();
				} else {
					goPrev();
				}
			}
		},
		[goNext, goPrev, viewportWidth]
	);

	return {
		activeIndex,
		trackIndex,
		setActiveIndex,
		goPrev,
		goNext,
		suppressTransition,
		onTransitionEnd,
		viewportRef,
		viewportWidth,
		dragOffset,
		isDragging,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		didDragRef: dragRef,
	};
}
