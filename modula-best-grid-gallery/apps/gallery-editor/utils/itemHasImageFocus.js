import {
	itemUsesCustomGridLetterbox,
	parseItemFocalCrop,
	parseItemFocalPoint,
} from 'gallery-shared/preview';
/**
 * Settings editor: detect *meaningful* per-image focus (focal crop or focal point) on a modula-images row.
 *
 * We ignore:
 * - full-frame crop (0–1 rect ≈ entire image) — no visual zoom/pan to lose;
 * - focal point at center (≈ 0.5, 0.5) — matches implicit default / many saved defaults.
 *
 * Otherwise every image looked “dirty” and the gallery-type change modal fired on every attempt.
 */


/** How close to 0.5 still counts as “default center” (float + UX). */
const FOCAL_CENTER = 0.5;
const FOCAL_CENTER_TOL = 0.02;

/**
 * @param {{ x: number, y: number, width: number, height: number }} crop
 * @return {boolean}
 */
function isFullFrameFocalCrop(crop) {
	if (!crop) {
		return false;
	}
	const { x, y, width, height } = crop;
	return x <= 0.001 && y <= 0.001 && width >= 0.999 && height >= 0.999;
}

/**
 * @param {Object|undefined|null} item
 * @return {boolean}
 */
function hasNonCenterFocalPoint(item) {
	const p = parseItemFocalPoint(item);
	if (!p) {
		return false;
	}
	return (
		Math.abs(p.x - FOCAL_CENTER) > FOCAL_CENTER_TOL ||
		Math.abs(p.y - FOCAL_CENTER) > FOCAL_CENTER_TOL
	);
}

/**
 * @param {Object|undefined|null} item Redux preview row.
 * @return {boolean}
 */
export function itemHasImageFocusData(item) {
	if (!item) {
		return false;
	}
	if (itemUsesCustomGridLetterbox(item)) {
		return true;
	}
	const crop = parseItemFocalCrop(item);
	if (crop && !isFullFrameFocalCrop(crop)) {
		return true;
	}
	return hasNonCenterFocalPoint(item);
}
