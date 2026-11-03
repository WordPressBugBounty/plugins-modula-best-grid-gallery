/**
 * Showcase strip geometry — natural aspect slides; active grows via CSS scale.
 * Layout widths stay stable across index changes so track translate stays smooth
 * when neighbors have different aspect ratios.
 *
 * Gutter stays uniform: flex gap is the configured value; the active slide gets
 * horizontal margin equal to its own scale overhang (not a global max-pad).
 *
 * @package
 */

import { resolveGalleryItemIntrinsicDimensions } from '../../utils/galleryItemIntrinsicDimensions';

/**
 * @param {unknown}               item
 * @param {object|null|undefined} [config]
 * @return {{ width: number, height: number }}
 */
export function getShowcaseItemAspectSize(item, config) {
	const intrinsic = resolveGalleryItemIntrinsicDimensions(item, config);
	if (intrinsic.width && intrinsic.height) {
		return { width: intrinsic.width, height: intrinsic.height };
	}

	const attr = item?.imgAttributes || item?.img_attributes || {};
	const aw = Number(attr.width || attr['data-width']);
	const ah = Number(attr.height || attr['data-height']);
	if (aw > 24 && ah > 24) {
		return { width: aw, height: ah };
	}

	const w = Number(item?.width);
	const h = Number(item?.height);
	if (w > 24 && h > 24) {
		return { width: w, height: h };
	}

	return { width: 3, height: 4 };
}

/**
 * @param {unknown}               item
 * @param {object|null|undefined} [config]
 * @return {number} width / height
 */
export function getShowcaseItemAspectRatio(item, config) {
	const { width, height } = getShowcaseItemAspectSize(item, config);
	return width / Math.max(height, 1);
}

/**
 * Photos the strip fits across the viewport ("How many photos to show at
 * once"). Odd counts are the centre photo plus whole neighbours; even counts
 * are the centre, whole neighbours and half a photo at each edge, because the
 * active photo is always centred. A gallery smaller than the count shows each
 * photo once (two photos excepted); one photo and Simplify on phones show one.
 *
 * @param {Object}  opts
 * @param {number}  opts.visibleCount setting value, already 2–5 (settingsToConfig)
 * @param {number}  opts.itemCount
 * @param {boolean} opts.simplify     phone with Simplify on phones
 * @return {number} photos across the viewport, 1–5
 */
export function resolveShowcaseVisibleCount({
	visibleCount,
	itemCount,
	simplify,
}) {
	if (simplify || itemCount <= 1) {
		return 1;
	}
	if (itemCount >= visibleCount) {
		return visibleCount;
	}
	/*
	 * Fewer photos than asked: an even window would show the same photo halved
	 * at both edges, so drop to the odd count below. Two photos stay at two —
	 * the other photo peeking on both sides is how a two-photo loop looks.
	 */
	const edgeHalvesWouldRepeat = itemCount % 2 === 0 && itemCount > 2;
	return edgeHalvesWouldRepeat ? itemCount - 1 : itemCount;
}

/**
 * One side of a centred window, in aspect-ratio units: half the scaled centre,
 * the whole neighbours, and half of the edge photo for even counts.
 *
 * @param {(index: number) => number} arAt         circular AR lookup
 * @param {number}                    active       centre index
 * @param {-1|1}                      dir          left or right
 * @param {number}                    visibleCount resolved count
 * @param {number}                    scale        centre scale
 * @return {number} AR units from the centre of the active photo to the edge
 */
function showcaseHalfWindowAspect(arAt, active, dir, visibleCount, scale) {
	const wholeNeighbors = Math.floor((visibleCount - 1) / 2);
	let sum = (arAt(active) * scale) / 2;
	for (let k = 1; k <= wholeNeighbors; k++) {
		sum += arAt(active + dir * k);
	}
	if (visibleCount % 2 === 0) {
		sum += arAt(active + dir * (wholeNeighbors + 1)) / 2;
	}
	return sum;
}

/**
 * Widest half-window over every active photo and both sides, so the strip
 * height does not change as the carousel moves.
 *
 * @param {number[]} aspectRatios
 * @param {number}   visibleCount resolved count (resolveShowcaseVisibleCount)
 * @param {number}   centerScale
 * @return {number} AR units; 0 for an empty gallery
 */
export function maxShowcaseHalfWindowAspect(
	aspectRatios,
	visibleCount,
	centerScale
) {
	const ratios = Array.isArray(aspectRatios) ? aspectRatios : [];
	const n = ratios.length;
	if (n === 0) {
		return 0;
	}
	const count = Math.max(1, Math.round(visibleCount) || 1);
	const scale = Math.max(1, Number(centerScale) || 1);
	const arAt = (i) => {
		const ar = ratios[((i % n) + n) % n];
		return Number.isFinite(ar) && ar > 0 ? ar : 0.75;
	};
	let max = 0;
	for (let active = 0; active < n; active++) {
		max = Math.max(
			max,
			showcaseHalfWindowAspect(arAt, active, -1, count, scale),
			showcaseHalfWindowAspect(arAt, active, 1, count, scale)
		);
	}
	return max;
}

/**
 * Neighbor height so the chosen number of photos (scaled centre included)
 * fits the viewport with the active photo centred. Stable for a given gallery
 * (does not depend on which slide is active).
 *
 * @param {Object}   opts
 * @param {number}   opts.viewportWidth
 * @param {number}   opts.gap
 * @param {number}   opts.centerScale
 * @param {boolean}  opts.mobile
 * @param {number[]} opts.aspectRatios
 * @param {number}   opts.visibleCount  resolved count
 * @return {number} neighbour slide height in px
 */
export function resolveShowcaseTrackHeight({
	viewportWidth,
	gap,
	centerScale,
	mobile,
	aspectRatios,
	visibleCount,
}) {
	const vw = Math.max(0, Number(viewportWidth) || 0);
	if (vw <= 0) {
		return mobile ? 260 : 420;
	}

	const ratios = Array.isArray(aspectRatios) ? aspectRatios : [];
	if (ratios.length === 0) {
		return mobile ? 260 : 420;
	}

	const g = Math.max(0, Number(gap) || 0);
	const count = Math.max(1, Math.round(visibleCount) || 1);
	// Every count puts floor(count / 2) gaps between the centre and an edge.
	const sideGaps = Math.floor(count / 2) * g;
	const halfAr = maxShowcaseHalfWindowAspect(
		ratios,
		count,
		mobile ? 1 : centerScale
	);

	const fit = mobile ? 0.94 : 0.98;
	const usable = Math.max(40, (vw * fit) / 2 - sideGaps);
	const neighborH = halfAr > 0 ? usable / halfAr : 320;

	/*
	 * The cap keeps tall photos on a screen; the desktop floor only guards
	 * against a collapsed strip, so it stays below what 5 landscape photos
	 * need on a tablet-width canvas and the chosen count wins.
	 */
	const maxH = mobile ? Math.min(vw * 0.9, 420) : Math.min(vw * 0.7, 640);
	const minH = mobile ? 120 : 48;
	return Math.round(Math.min(maxH, Math.max(minH, neighborH)));
}

/**
 * Layout boxes for every track node. Active enlargement is CSS scale — widths
 * here stay neighbor-sized so translateX does not jump when ARs differ.
 *
 * @param {Object}   opts
 * @param {number[]} opts.aspectRatios   source list ARs
 * @param {number}   opts.neighborHeight
 * @param {number}   [opts.copies]
 * @return {{ widths: number[], heights: number[] }}
 */
export function resolveShowcaseTrackBoxes({
	aspectRatios,
	neighborHeight,
	copies = 1,
}) {
	const source = Array.isArray(aspectRatios) ? aspectRatios : [];
	const n = source.length;
	const h0 = Math.max(40, Number(neighborHeight) || 400);
	const reps = Math.max(1, copies | 0);
	const widths = [];
	const heights = [];
	for (let c = 0; c < reps; c++) {
		for (let i = 0; i < n; i++) {
			const ar =
				Number.isFinite(source[i]) && source[i] > 0 ? source[i] : 0.75;
			widths.push(Math.max(48, h0 * ar));
			heights.push(h0);
		}
	}
	return { widths, heights };
}

/**
 * Horizontal margin on the active slide so CSS scale does not eat the flex gap.
 * Equal to that slide’s own overhang — keeps gutter identical for every AR.
 *
 * @param {number} width       neighbor layout width
 * @param {number} centerScale
 * @return {number}
 */
export function resolveShowcaseActiveMarginX(width, centerScale) {
	const w = Math.max(0, Number(width) || 0);
	const scale = Math.max(1, Number(centerScale) || 1);
	if (w <= 0 || scale <= 1) {
		return 0;
	}
	return (w * (scale - 1)) / 2;
}

/**
 * Translate so trackIndex stays centered (accounts for active scale margins).
 * A lone photo is centred too: Showcase has no other active photo position.
 *
 * @param {Object}   opts
 * @param {number[]} opts.slideWidths
 * @param {number}   opts.trackIndex
 * @param {number}   opts.viewportWidth
 * @param {number}   opts.gap
 * @param {number}   [opts.centerScale]
 * @return {number} Track translateX in px.
 */
export function computeShowcaseTranslateX({
	slideWidths,
	trackIndex,
	viewportWidth,
	gap,
	centerScale = 1,
}) {
	const widths = Array.isArray(slideWidths) ? slideWidths : [];
	const len = widths.length;
	if (len === 0 || viewportWidth <= 0) {
		return 0;
	}
	const i = Math.max(0, Math.min(len - 1, trackIndex | 0));
	const g = Math.max(0, Number(gap) || 0);
	const scale = Math.max(1, Number(centerScale) || 1);

	let offset = 0;
	for (let k = 0; k < i; k++) {
		offset += widths[k] + g;
	}
	const activeW = widths[i] || 0;
	const marginX = resolveShowcaseActiveMarginX(activeW, scale);
	/*
	 * Flex places margin outside the width box. Visual/layout center of the
	 * scaled active footprint is midpoint of (margin + width + margin).
	 */
	const footprintCenter = marginX + activeW / 2;
	return -(offset + footprintCenter - viewportWidth / 2);
}
