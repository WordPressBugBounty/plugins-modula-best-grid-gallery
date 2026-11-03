/**
 * Canvas watermark preview: what Apply would burn in, and where.
 *
 * Pro burns the mark into the full-resolution original
 * (`Watermarking::add_watermark()`) and WordPress derives every served size
 * from that file. The preview therefore lays the mark out in the original's
 * pixels with Pro's rules, then maps that frame onto the tile's image:
 *
 * - text size and margin are shares of the image width (Lite's
 *   `Watermark_Scale::px_for_width()`), the margin on both axes;
 * - the 9-point grid is `Watermarking::calculate_position()`;
 * - a text box is the string's ink extents (GD's `imagettfbbox`), drawn with
 *   its baseline at the box bottom;
 * - an image mark is sized by `watermark_gd()`'s width/height rules and
 *   shrunk to 25% when larger than the image.
 *
 * With Override global watermark off, Apply burns the global settings
 * (image-only, margin in px on the original).
 *
 * @package
 */

import { isWpTruthy } from '../logic/wpTruthy';

/** Pro's system TrueType candidates, in its order (Arial, DejaVu Sans, Liberation Sans). */
export const WATERMARK_PREVIEW_FONT_FAMILY =
	'Arial, "DejaVu Sans", "Liberation Sans", sans-serif';

/** Pro's 9-point grid keys. */
const WATERMARK_POSITIONS = new Set([
	'top_left',
	'top_center',
	'top_right',
	'middle_left',
	'center',
	'middle_right',
	'bottom_left',
	'bottom_center',
	'bottom_right',
]);

/** Pro's share of an image mark kept when the mark is larger than the image. */
const OVERSIZED_IMAGE_MARK_SCALE = 0.25;

/**
 * @typedef {Object} WatermarkPreviewMark
 * @property {'text'|'image'}               type            What Apply burns.
 * @property {string}                       text            Text type: the string Pro draws.
 * @property {string}                       color           Text type: `#RRGGBB`.
 * @property {number}                       opacity         0–1.
 * @property {string}                       position        One of Pro's 9-point keys.
 * @property {number}                       textSizeShare   Text type: percent of the image width.
 * @property {{share: number}|{px: number}} margin          Gallery settings: share of the width; global: px on the original.
 * @property {number}                       imageId         Image type: attachment ID of the mark.
 * @property {number}                       dimensionWidth  Image type: px on the original; 0 keeps the file's.
 * @property {number}                       dimensionHeight Image type: px on the original; 0 keeps the file's.
 */

/**
 * @param {unknown} value
 * @return {number} Finite number, or NaN.
 */
function toNumber(value) {
	if (value === null || value === '' || typeof value === 'boolean') {
		return NaN;
	}
	const n = Number(value);
	return Number.isFinite(n) ? n : NaN;
}

/**
 * PHP `absint()` of a stored setting.
 *
 * @param {unknown} value
 * @return {number} Non-negative integer; 0 for a non-number.
 */
function absInt(value) {
	const n = toNumber(value);
	return Number.isNaN(n) ? 0 : Math.abs(Math.trunc(n));
}

const WHITE = { hex: '#FFFFFF', alpha: 1 };

const RGB_FUNCTION =
	/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/i;

/**
 * @param {number} channel 0–255.
 * @return {string} Two upper-case hex digits.
 */
function hexByte(channel) {
	return Math.min(255, channel).toString(16).padStart(2, '0').toUpperCase();
}

/**
 * Pro's `parse_text_color()`: the colour picker's `rgba(r,g,b,a)` (also
 * `rgb()`, space-separated), `#RGB`, `#RRGGBB` or `#RRGGBBAA`; white
 * otherwise. The alpha multiplies the watermark opacity.
 *
 * @param {unknown} value Stored colour.
 * @return {{hex: string, alpha: number}} `#RRGGBB` and alpha 0–1.
 */
export function parseWatermarkColor(value) {
	const raw = String(value ?? '').trim();
	const rgb = RGB_FUNCTION.exec(raw);
	if (rgb) {
		const alpha =
			rgb[4] === undefined
				? 1
				: Number(rgb[4]) / (rgb[5] === '%' ? 100 : 1);
		return {
			hex: `#${[rgb[1], rgb[2], rgb[3]].map((c) => hexByte(Number(c))).join('')}`,
			alpha: Math.max(0, Math.min(1, alpha)),
		};
	}

	const hex = raw.replace(/^#+/, '');
	if (/^[0-9a-f]{3}$/i.test(hex)) {
		return {
			hex: `#${hex
				.split('')
				.map((c) => c + c)
				.join('')}`.toUpperCase(),
			alpha: 1,
		};
	}
	if (/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) {
		return {
			hex: `#${hex.slice(0, 6)}`.toUpperCase(),
			alpha: hex.length === 8 ? parseInt(hex.slice(6), 16) / 255 : 1,
		};
	}
	return WHITE;
}

/**
 * Pro's burn opacity (`extract_watermark_burn_settings()` + `resolve_opacity()`).
 *
 * @param {unknown} value Stored 0–100.
 * @return {number} 0–1.
 */
function opacityFraction(value) {
	const percent = value === undefined || value === null ? 60 : absInt(value);
	return Math.min(100, percent) / 100;
}

/**
 * @param {unknown} value
 * @return {string} A 9-point key; Pro's unknown keys fall back to the top-left corner.
 */
function normalizePosition(value) {
	return WATERMARK_POSITIONS.has(value) ? value : 'top_left';
}

/**
 * Text Pro draws: tags stripped, trimmed (`wp_strip_all_tags()` + `trim()`).
 *
 * @param {unknown} value
 * @return {string} Plain text; empty when nothing would be drawn.
 */
function watermarkText(value) {
	return String(value ?? '')
		.replace(/<(script|style)[^>]*?>[\s\S]*?<\/\1>/gi, '')
		.replace(/<[^>]*>/g, '')
		.trim();
}

/**
 * The gallery's own settings (Override global watermark on).
 *
 * @param {Record<string, unknown>} group Grouped `watermark` settings.
 * @return {WatermarkPreviewMark|null} Null for type None, empty text or no image.
 */
function galleryMark(group) {
	const type = group.watermarkType;
	const marginShare = toNumber(group.watermarkMarginShare);
	if (Number.isNaN(marginShare)) {
		return null;
	}
	const common = {
		opacity: opacityFraction(group.watermarkOpacity),
		position: normalizePosition(group.watermarkPosition),
		margin: { share: Math.max(0, marginShare) },
	};

	if (type === 'text') {
		const text = watermarkText(group.watermarkText);
		const textSizeShare = toNumber(group.watermarkTextSizeShare);
		if (text === '' || !(textSizeShare > 0)) {
			return null;
		}
		const color = parseWatermarkColor(group.watermarkTextColor);
		return {
			...common,
			type: 'text',
			text,
			color: color.hex,
			opacity: common.opacity * color.alpha,
			textSizeShare,
		};
	}

	if (type === 'image') {
		const imageId = absInt(group.watermarkImage);
		if (imageId <= 0) {
			return null;
		}
		return {
			...common,
			type: 'image',
			imageId,
			dimensionWidth: absInt(group.watermarkImageDimensionWidth),
			dimensionHeight: absInt(group.watermarkImageDimensionHeight),
		};
	}

	return null;
}

/**
 * The global settings (Override off): Pro's `get_global_burn_settings()`.
 *
 * @param {Record<string, unknown>|null|undefined} global Flat burn settings from the editor config.
 * @return {WatermarkPreviewMark|null} Null without settings or a global image.
 */
function globalMark(global) {
	if (!global || typeof global !== 'object') {
		return null;
	}
	const imageId = absInt(global.watermark_image);
	if (imageId <= 0) {
		return null;
	}
	return {
		type: 'image',
		imageId,
		opacity: opacityFraction(global.watermark_opacity),
		position: normalizePosition(global.watermark_position),
		margin: { px: absInt(global.watermark_margin) },
		dimensionWidth: absInt(global.watermark_image_dimension_width),
		dimensionHeight: absInt(global.watermark_image_dimension_height),
	};
}

/**
 * The mark Apply would burn with the editor's current settings.
 *
 * @param {Record<string, unknown>|null|undefined} group  Grouped `watermark` settings (live form values).
 * @param {Record<string, unknown>|null|undefined} global `watermarkGlobal` from the editor config (Pro).
 * @return {WatermarkPreviewMark|null} Null when watermarking is off or nothing would be burned.
 */
export function resolveWatermarkPreviewMark(group, global) {
	if (
		!group ||
		typeof group !== 'object' ||
		!isWpTruthy(group.enableWatermark)
	) {
		return null;
	}
	return isWpTruthy(group.customSettingsWatermark)
		? galleryMark(group)
		: globalMark(global);
}

/**
 * Lite's `Watermark_Scale::px_for_width()`.
 *
 * @param {number} share      Percent of the image width.
 * @param {number} imageWidth Image width in px.
 * @return {number} 0 only for a 0% share; any positive share is at least 1px.
 */
export function watermarkPxForWidth(share, imageWidth) {
	if (!(share > 0)) {
		return 0;
	}
	return Math.max(
		1,
		Math.round((Math.max(0, Math.trunc(imageWidth)) * share) / 100)
	);
}

/**
 * Margin in px on the original.
 *
 * @param {WatermarkPreviewMark['margin']} margin     Share of the width, or px.
 * @param {number}                         imageWidth Original width.
 * @return {number} Margin px, the same on both axes.
 */
export function watermarkMarginPx(margin, imageWidth) {
	return 'share' in margin
		? watermarkPxForWidth(margin.share, imageWidth)
		: margin.px;
}

/**
 * Pro's `calculate_position()`: the mark box's top-left.
 *
 * @param {string} position 9-point key.
 * @param {number} margin   Margin px.
 * @param {number} imageW   Image width.
 * @param {number} imageH   Image height.
 * @param {number} markW    Mark width.
 * @param {number} markH    Mark height.
 * @return {{x: number, y: number}} Top-left of the box; an unknown key keeps the top-left corner.
 */
export function placeWatermarkBox(
	position,
	margin,
	imageW,
	imageH,
	markW,
	markH
) {
	if (!WATERMARK_POSITIONS.has(position)) {
		return { x: margin, y: margin };
	}
	const [vertical, horizontal] =
		position === 'center' ? ['middle', 'center'] : position.split('_');
	const x = {
		left: margin,
		center: (imageW - markW) / 2,
		right: imageW - markW - margin,
	}[horizontal];
	const y = {
		top: margin,
		middle: (imageH - markH) / 2,
		bottom: imageH - markH - margin,
	}[vertical];
	return { x, y };
}

/**
 * @typedef {Object} WatermarkInkMetrics
 * @property {number} left    Ink extent left of the pen origin (canvas `actualBoundingBoxLeft`).
 * @property {number} right   Ink extent right of the origin (`actualBoundingBoxRight`).
 * @property {number} ascent  Ink above the baseline (`actualBoundingBoxAscent`).
 * @property {number} descent Ink below the baseline (`actualBoundingBoxDescent`).
 */

/**
 * Text mark on the original, as GD draws it (`watermark_text_gd()`).
 *
 * GD's box is the string's ink extents in whole px; the pen starts at the
 * box's x and its baseline sits on the box bottom.
 *
 * @param {WatermarkPreviewMark}                        mark    A text mark.
 * @param {{width: number, height: number}}             source  Original size.
 * @param {(fontSizePx: number) => WatermarkInkMetrics} measure Ink metrics of `mark.text` at a font size.
 * @return {{fontSize: number, x: number, y: number}} Font size (em px) and baseline origin.
 */
export function layoutTextWatermark(mark, source, measure) {
	const fontSize = Math.max(
		1,
		watermarkPxForWidth(mark.textSizeShare, source.width)
	);
	const ink = measure(fontSize);
	const markW = Math.abs(Math.round(ink.right) + Math.round(ink.left));
	const markH = Math.abs(Math.round(ink.ascent) + Math.round(ink.descent));
	const box = placeWatermarkBox(
		mark.position,
		watermarkMarginPx(mark.margin, source.width),
		source.width,
		source.height,
		markW,
		markH
	);
	return {
		fontSize,
		x: Math.trunc(box.x),
		y: Math.trunc(box.y) + markH,
	};
}

/**
 * Image mark on the original, as `watermark_gd()` sizes and places it.
 *
 * @param {WatermarkPreviewMark}            mark   An image mark.
 * @param {{width: number, height: number}} source Original size.
 * @param {{width: number, height: number}} file   The mark file's size.
 * @return {{x: number, y: number, width: number, height: number}} The mark's box on the original.
 */
export function layoutImageWatermark(mark, source, file) {
	const ratio = file.height > 0 ? file.width / file.height : 1;
	const dimW = mark.dimensionWidth;
	const dimH = mark.dimensionHeight;
	let width = file.width;
	let height = file.height;
	if (dimW > 0 && dimH > 0) {
		width = dimW;
		height = dimH;
	} else if (dimW > 0) {
		width = dimW;
		height = Math.trunc(dimW / ratio);
	} else if (dimH > 0) {
		width = Math.trunc(dimH * ratio);
		height = dimH;
	}
	if (width > source.width || height > source.height) {
		width = Math.trunc(width * OVERSIZED_IMAGE_MARK_SCALE);
		height = Math.trunc(height * OVERSIZED_IMAGE_MARK_SCALE);
	}
	const box = placeWatermarkBox(
		mark.position,
		watermarkMarginPx(mark.margin, source.width),
		source.width,
		source.height,
		width,
		height
	);
	return { x: Math.trunc(box.x), y: Math.trunc(box.y), width, height };
}

/**
 * One axis of a CSS `object-position` (computed value).
 *
 * @param {string} token `50%`, `12px`, or a keyword.
 * @param {number} spare Box size minus content size on this axis.
 * @return {number} Content offset in px.
 */
function objectPositionOffset(token, spare) {
	const keyword = { left: 0, top: 0, center: 50, right: 100, bottom: 100 }[
		token
	];
	if (keyword !== undefined) {
		return (spare * keyword) / 100;
	}
	if (typeof token === 'string' && token.endsWith('%')) {
		return (spare * parseFloat(token)) / 100;
	}
	const px = parseFloat(token);
	return Number.isFinite(px) ? px : spare / 2;
}

/**
 * Where an `<img>` draws its file inside its box (CSS `object-fit` / `object-position`).
 *
 * @param {Object} args                  Image box and file.
 * @param {number} args.boxWidth         Box width.
 * @param {number} args.boxHeight        Box height.
 * @param {number} args.naturalWidth     File width.
 * @param {number} args.naturalHeight    File height.
 * @param {string} [args.objectFit]      Computed `object-fit` (default `fill`).
 * @param {string} [args.objectPosition] Computed `object-position` (default `50% 50%`).
 * @return {{left: number, top: number, width: number, height: number}} In box px.
 */
export function imageContentRect({
	boxWidth,
	boxHeight,
	naturalWidth,
	naturalHeight,
	objectFit = 'fill',
	objectPosition = '50% 50%',
}) {
	if (objectFit === 'fill' || !(naturalWidth > 0) || !(naturalHeight > 0)) {
		return { left: 0, top: 0, width: boxWidth, height: boxHeight };
	}
	const fitScale = {
		cover: Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight),
		contain: Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight),
		none: 1,
		'scale-down': Math.min(
			1,
			boxWidth / naturalWidth,
			boxHeight / naturalHeight
		),
	}[objectFit];
	const scale = fitScale === undefined ? 1 : fitScale;
	const width = naturalWidth * scale;
	const height = naturalHeight * scale;
	const [posX = '50%', posY = '50%'] = String(objectPosition)
		.trim()
		.split(/\s+/);
	return {
		left: objectPositionOffset(posX, boxWidth - width),
		top: objectPositionOffset(posY, boxHeight - height),
		width,
		height,
	};
}

/**
 * Where the whole original sits, given the served file's drawn rect.
 *
 * WordPress derives a size from the original by scaling it to cover the
 * size and cropping the overflow evenly (a proportional size crops nothing),
 * so the original frame extends past the served file by that crop.
 *
 * @param {{left: number, top: number, width: number, height: number}} content Drawn rect of the served file.
 * @param {{width: number, height: number}}                            natural Served file size.
 * @param {{width: number, height: number}}                            source  Original size.
 * @return {{left: number, top: number, width: number, height: number}} The original's rect, in the same px as `content`.
 */
export function sourceFrameRect(content, natural, source) {
	const resize = Math.max(
		natural.width / source.width,
		natural.height / source.height
	);
	const cropX = (source.width * resize - natural.width) / 2;
	const cropY = (source.height * resize - natural.height) / 2;
	const toBoxX = content.width / natural.width;
	const toBoxY = content.height / natural.height;
	return {
		left: content.left - cropX * toBoxX,
		top: content.top - cropY * toBoxY,
		width: source.width * resize * toBoxX,
		height: source.height * resize * toBoxY,
	};
}
