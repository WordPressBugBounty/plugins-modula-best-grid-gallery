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
 * @param {unknown} item
 * @param {object|null|undefined} [config]
 * @returns {{ width: number, height: number }}
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
 * @param {unknown} item
 * @param {object|null|undefined} [config]
 * @returns {number} width / height
 */
export function getShowcaseItemAspectRatio(item, config) {
	const { width, height } = getShowcaseItemAspectSize(item, config);
	return width / Math.max(height, 1);
}

/**
 * Worst-case weighted AR for a window: neighbors at 1×, center slot at scale.
 * Stable across activeIndex (max over every circular window).
 *
 * @param {number[]} aspectRatios
 * @param {number} windowSize
 * @param {number} centerScale
 * @returns {number}
 */
export function maxShowcaseWindowWeightedAspectSum(
	aspectRatios,
	windowSize,
	centerScale
) {
	const ratios = Array.isArray(aspectRatios) ? aspectRatios : [];
	const n = ratios.length;
	if (n === 0) {
		return 0;
	}
	const size = Math.max(1, Math.min(n, Math.round(windowSize) || 3));
	const scale = Math.max(1, Number(centerScale) || 1);
	const activeSlot = Math.floor((size - 1) / 2);
	let max = 0;
	for (let start = 0; start < n; start++) {
		let sum = 0;
		for (let k = 0; k < size; k++) {
			const ar = ratios[(start + k) % n];
			const safe = Number.isFinite(ar) && ar > 0 ? ar : 0.75;
			sum += k === activeSlot ? safe * scale : safe;
		}
		if (sum > max) {
			max = sum;
		}
	}
	return max;
}

/**
 * Neighbor height so a full window (with scaled center footprint) fits.
 * Stable for a given gallery (does not depend on which slide is active).
 *
 * @param {object} opts
 * @param {number} opts.viewportWidth
 * @param {number} opts.gap
 * @param {number} opts.centerScale
 * @param {boolean} opts.mobile
 * @param {number[]} opts.aspectRatios
 * @param {number} opts.windowSize
 * @returns {number}
 */
export function resolveShowcaseTrackHeight({
	viewportWidth,
	gap,
	centerScale,
	mobile,
	aspectRatios,
	windowSize = 3,
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
	const size = Math.max(1, Math.round(windowSize) || 3);
	const gaps = Math.max(0, size - 1) * g;
	const weightedAr = maxShowcaseWindowWeightedAspectSum(
		ratios,
		size,
		mobile ? 1 : centerScale
	);

	const fit = mobile ? 0.94 : 0.98;
	const usable = Math.max(80, vw * fit - gaps);
	const neighborH = weightedAr > 0 ? usable / weightedAr : 320;

	const maxH = mobile ? Math.min(vw * 0.9, 420) : Math.min(vw * 0.7, 640);
	const minH = mobile ? 120 : 140;
	return Math.round(Math.min(maxH, Math.max(minH, neighborH)));
}

/**
 * Layout boxes for every track node. Active enlargement is CSS scale — widths
 * here stay neighbor-sized so translateX does not jump when ARs differ.
 *
 * @param {object} opts
 * @param {number[]} opts.aspectRatios source list ARs
 * @param {number} opts.neighborHeight
 * @param {number} [opts.copies]
 * @returns {{ widths: number[], heights: number[] }}
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
 * @param {number} width neighbor layout width
 * @param {number} centerScale
 * @returns {number}
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
 *
 * @param {object} opts
 * @param {number[]} opts.slideWidths
 * @param {number} opts.trackIndex
 * @param {number} opts.viewportWidth
 * @param {number} opts.gap
 * @param {number} [opts.centerScale]
 * @param {'center'|'left'} opts.centerBias
 * @returns {number}
 */
export function computeShowcaseTranslateX({
	slideWidths,
	trackIndex,
	viewportWidth,
	gap,
	centerScale = 1,
	centerBias,
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
	const bias = centerBias === 'left' ? 0.38 : 0.5;
	const targetCenter = viewportWidth * bias;
	if (centerBias === 'left') {
		return -(offset + activeW * bias + marginX - targetCenter);
	}
	return -(offset + footprintCenter - targetCenter);
}
