/**
 * Resolve bitmap width/height for focal-crop math.
 * Row `width`/`height` on modula-images are custom-grid cell spans (1–12), not pixels.
 *
 * @package
 */

/**
 * @param {unknown} value
 * @return {number|undefined}
 */
function positiveNumber(value) {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * modula-images stores 1–12 cell spans on width/height for many gallery types.
 *
 * @param {number|undefined} width
 * @param {number|undefined} height
 * @return {boolean}
 */
function looksLikeGridSpan(width, height) {
	if (width === undefined || height === undefined) {
		return false;
	}
	return (
		width <= 24 &&
		height <= 24 &&
		Number.isInteger(width) &&
		Number.isInteger(height)
	);
}

/**
 * @param {Object|null|undefined} itemData
 * @param {Object|null|undefined} config    Gallery config (`config.type`).
 * @return {{ width: number|undefined, height: number|undefined }}
 */
export function resolveGalleryItemIntrinsicDimensions(itemData, config) {
	const imgAttrSource =
		itemData?.imgAttributes || itemData?.img_attributes || {};
	const attrWidth = positiveNumber(
		imgAttrSource.width ?? imgAttrSource.dataWidth
	);
	const attrHeight = positiveNumber(
		imgAttrSource.height ?? imgAttrSource.dataHeight
	);
	if (attrWidth && attrHeight) {
		return { width: attrWidth, height: attrHeight };
	}

	const galleryType = typeof config?.type === 'string' ? config.type : '';
	if (galleryType === 'custom-grid') {
		return { width: undefined, height: undefined };
	}

	const rowWidth = positiveNumber(itemData?.width);
	const rowHeight = positiveNumber(itemData?.height);
	if (rowWidth && rowHeight && !looksLikeGridSpan(rowWidth, rowHeight)) {
		return { width: rowWidth, height: rowHeight };
	}

	return { width: undefined, height: undefined };
}
