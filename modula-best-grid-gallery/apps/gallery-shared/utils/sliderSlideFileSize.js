/**
 * Slider "Image file size" → the pixel box a slide's file is served at.
 *
 * With Height follows slide and no Custom crop, a slide shows at its file's
 * width (capped by the slider), so choosing a larger size shows a larger
 * slide. The canvas keeps the files it loaded, so the width is derived from
 * the choice instead of read from the served file: the rules mirror what Pro
 * serves (`extensions/slider/class-slider.php` change_image_size).
 *
 * @package
 */

/**
 * @typedef {Object} SliderSlideFileBox
 * @property {'named'|'custom'|'full'} kind     A WordPress size, Custom dimensions, or the Full file.
 * @property {number}                  [width]  Box width; 0 = unbounded (named sizes).
 * @property {number}                  [height] Box height; 0 = unbounded.
 * @property {boolean}                 [crop]   Named size crops to the box.
 */

/**
 * @param {unknown} value
 * @return {number} Whole pixels, 0 when missing or invalid.
 */
function toPixels(value) {
	const n = parseInt(value ?? 0, 10);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Gallery-level box for the slider's Image file size. Custom + crop is not
 * resolved here: that choice fills the slider width (`sliderFillCrop`).
 *
 * @param {Object}                 slider  Grouped `slider` settings.
 * @param {Record<string, Object>} catalog WordPress sizes by name: `{ width, height, crop }`.
 * @return {SliderSlideFileBox|null} Null when the size is unknown: the slide keeps its file's width.
 */
export function resolveSliderSlideFileBox(slider, catalog) {
	const raw = typeof slider?.imageSize === 'string' ? slider.imageSize : '';
	// Pro serves Large for the legacy empty and "default" slugs.
	const size =
		raw.trim() === '' || raw.trim() === 'default' ? 'large' : raw.trim();
	if (size === 'full') {
		return { kind: 'full' };
	}
	if (size === 'custom') {
		const width = toPixels(slider?.imageDimensions?.width);
		const height = toPixels(slider?.imageDimensions?.height);
		return width > 0 && height > 0
			? { kind: 'custom', width, height }
			: null;
	}
	const named = catalog && typeof catalog === 'object' ? catalog[size] : null;
	if (!named || typeof named !== 'object') {
		return null;
	}
	const width = toPixels(named.width);
	const height = toPixels(named.height);
	if (width === 0 && height === 0) {
		return null;
	}
	return { kind: 'named', width, height, crop: Boolean(named.crop) };
}

/**
 * The editor-only `fullImageSize` of a preview item.
 *
 * @param {unknown} size
 * @return {{ width: number, height: number }|null} Null when absent or invalid.
 */
export function readSliderSlideFullSize(size) {
	const width = toPixels(size?.width);
	const height = toPixels(size?.height);
	return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * Named size: WordPress never upscales; a crop is the box clipped to the
 * original, otherwise the original scales down into the box.
 *
 * @param {SliderSlideFileBox}                box
 * @param {{ width: number, height: number }} original
 * @return {{ width: number, height: number }} The derivative's size.
 */
function namedSizeFile(box, original) {
	if (box.crop && box.width > 0 && box.height > 0) {
		return {
			width: Math.min(box.width, original.width),
			height: Math.min(box.height, original.height),
		};
	}
	const scale = Math.min(
		1,
		box.width > 0 ? box.width / original.width : 1,
		box.height > 0 ? box.height / original.height : 1
	);
	return {
		width: Math.round(original.width * scale),
		height: Math.round(original.height * scale),
	};
}

/**
 * Custom size without crop: Pro keeps the box's longer side and the image
 * ratio. Unlike Pro's width attribute, the slide never grows past the
 * original, since the resizer cannot enlarge the file.
 *
 * @param {SliderSlideFileBox}                box
 * @param {{ width: number, height: number }} original
 * @return {{ width: number, height: number }} The resized file's size.
 */
function customSizeFile(box, original) {
	const ratio = original.width / original.height;
	const width =
		box.width >= box.height ? box.width : Math.round(box.height * ratio);
	const capped = Math.min(width, original.width);
	return { width: capped, height: Math.round(capped / ratio) };
}

/**
 * Pixel size of one slide's file for the gallery's box. Idempotent: the
 * visitor's item already carries the served size, the canvas item the
 * original, and both resolve to the same file size.
 *
 * @param {SliderSlideFileBox|null}                       box
 * @param {{ width?: number, height?: number }|undefined} original Item bitmap size.
 * @return {{ width: number, height: number }|null} Null without the item's size.
 */
export function getSliderSlideFileSize(box, original) {
	const width = Number(original?.width);
	const height = Number(original?.height);
	if (!(width > 0) || !(height > 0)) {
		return null;
	}
	const source = { width, height };
	if (!box || box.kind === 'full') {
		return source;
	}
	return box.kind === 'custom'
		? customSizeFile(box, source)
		: namedSizeFile(box, source);
}
