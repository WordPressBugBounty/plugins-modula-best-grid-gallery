/**
 * Detect when a gallery tile is too small for inline title/caption.
 *
 * Prefer stable layout slot hints when available — measuring the image area while
 * below-image captions show/hide causes compact ↔ inline oscillation (shimmer).
 */

import {
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from '@wordpress/element';

import {
	COMPACT_CAPTION_MIN_SIDE_PX,
	isCompactCaptionTileSize,
	readElementContentBox,
	resolveCompactCaptionMinSize,
} from '../utils/compactCaptionTile';

/**
 * @param {boolean} enabled
 * @param {{ width?: number, height?: number, minSize?: number }} [slotHint]
 * @return {{ measureRef: function, isCompact: boolean }}
 */
export function useCompactCaptionTile(enabled, slotHint = {}) {
	const hintWidth = Number(slotHint?.width) > 0 ? Number(slotHint.width) : 0;
	const hintHeight =
		Number(slotHint?.height) > 0 ? Number(slotHint.height) : 0;
	const minSize = resolveCompactCaptionMinSize(
		slotHint?.minSize ?? COMPACT_CAPTION_MIN_SIDE_PX
	);
	const hasStableSlotHint = hintWidth > 0 && hintHeight > 0;
	const [element, setElement] = useState(null);
	const [measured, setMeasured] = useState(() => ({
		width: hintWidth,
		height: hintHeight,
	}));
	const stickyCompactRef = useRef(false);
	const previousMinSizeRef = useRef(minSize);
	if (previousMinSizeRef.current !== minSize) {
		previousMinSizeRef.current = minSize;
		stickyCompactRef.current = false;
	}

	const measureRef = useCallback((node) => {
		setElement(node);
	}, []);

	useLayoutEffect(() => {
		if (!enabled) {
			stickyCompactRef.current = false;
			setMeasured({ width: hintWidth, height: hintHeight });
			return undefined;
		}
		// Layout already knows the image slot — do not observe a box that grows/shrinks
		// when below-image captions are toggled by compact mode.
		if (hasStableSlotHint) {
			setMeasured({ width: hintWidth, height: hintHeight });
			return undefined;
		}
		if (!element || typeof ResizeObserver === 'undefined') {
			setMeasured({ width: hintWidth, height: hintHeight });
			return undefined;
		}
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) {
				return;
			}
			const box = readElementContentBox(entry.target);
			setMeasured((previous) => {
				if (
					previous.width === box.width &&
					previous.height === box.height
				) {
					return previous;
				}
				return box;
			});
		});
		observer.observe(element);
		setMeasured(readElementContentBox(element));
		return () => {
			observer.disconnect();
		};
	}, [enabled, element, hasStableSlotHint, hintWidth, hintHeight]);

	const width = hasStableSlotHint
		? hintWidth
		: measured.width > 0
			? measured.width
			: hintWidth;
	const height = hasStableSlotHint
		? hintHeight
		: measured.height > 0
			? measured.height
			: hintHeight;

	const nextCompact = Boolean(
		enabled &&
			isCompactCaptionTileSize(width, height, {
				stickyCompact: stickyCompactRef.current,
				minSize,
			})
	);
	stickyCompactRef.current = nextCompact;

	return {
		measureRef,
		isCompact: nextCompact,
	};
}

/**
 * @return {boolean}
 */
export function useCoarsePointer() {
	const [coarse, setCoarse] = useState(() => {
		if (typeof window === 'undefined' || !window.matchMedia) {
			return false;
		}
		return window.matchMedia('(hover: none), (pointer: coarse)').matches;
	});

	useLayoutEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) {
			return undefined;
		}
		const media = window.matchMedia('(hover: none), (pointer: coarse)');
		const onChange = () => {
			setCoarse(media.matches);
		};
		onChange();
		if (typeof media.addEventListener === 'function') {
			media.addEventListener('change', onChange);
			return () => {
				media.removeEventListener('change', onChange);
			};
		}
		media.addListener(onChange);
		return () => {
			media.removeListener(onChange);
		};
	}, []);

	return coarse;
}

/**
 * Compose multiple React callback/object refs into one (new function each call).
 * Prefer {@link useComposedCallbackRefs} in components — a fresh callback ref every
 * render re-runs commitAttachRef and can nest setState (Maximum update depth).
 *
 * @param {...(function|Object|null|undefined)} refs
 * @return {function|undefined}
 */
export function composeCallbackRefs(...refs) {
	const useful = refs.filter(Boolean);
	if (useful.length === 0) {
		return undefined;
	}
	return (node) => {
		useful.forEach((ref) => {
			if (typeof ref === 'function') {
				ref(node);
			} else if (ref && typeof ref === 'object') {
				ref.current = node;
			}
		});
	};
}

/**
 * Stable composed callback ref for layout/measure refs that call setState.
 * Unlike {@link composeCallbackRefs}, identity is stable across renders so React
 * does not re-run commitAttachRef (which nested setState loops in BnB fillSlot).
 *
 * @param {...(function|Object|null|undefined)} refs
 * @return {function|undefined}
 */
export function useComposedCallbackRefs(...refs) {
	const refsRef = useRef(refs);
	refsRef.current = refs;
	const hasUseful = refs.some(Boolean);

	const composed = useCallback((node) => {
		refsRef.current.forEach((ref) => {
			if (!ref) {
				return;
			}
			if (typeof ref === 'function') {
				ref(node);
			} else if (typeof ref === 'object') {
				ref.current = node;
			}
		});
	}, []);

	return hasUseful ? composed : undefined;
}
