/**
 * Gallery item image: sizes, picture sources, and img attributes.
 * Uses WordPress srcset/sizes (from item processor) for responsive images; legacy vs cover style for layout.
 */

import {
	mergeReactClassNameProps,
	normalizeReactDomProps,
	spreadAttrs,
} from './attributeUtils';
import { getMimeTypeFromUrl } from './imageMime';
import { getPictureSources } from './pictureSources';
import { computeLegacyImageStyle } from './legacyImagePlacement';
import { isLazyLoadEnabled } from './lazyLoad';
import {
	itemUsesCustomGridLetterbox,
	MODULA_IMG_LETTERBOX_CONTAIN_CLASS,
} from './customGridTileImageFit';

function isDefined(value) {
	return value !== null && value !== undefined;
}

function isValidPositiveNumber(value) {
	const n = Number(value);
	return isDefined(value) && !Number.isNaN(n) && n > 0;
}

/**
 * Normalized focal point 0–1 from item row or img data attributes.
 *
 * @param {Object} itemData - Raw item from store / bootstrap.
 * @return {{ x: number, y: number }|null} Focal point or null when unset.
 */
export function parseItemFocalPoint(itemData) {
	if (!itemData) {
		return null;
	}
	const imgAttrs = itemData.imgAttributes || itemData.img_attributes || {};
	const x = parseFloat(itemData.focal_x ?? imgAttrs['data-focal-x']);
	const y = parseFloat(itemData.focal_y ?? imgAttrs['data-focal-y']);
	if (Number.isFinite(x) && Number.isFinite(y)) {
		return {
			x: Math.min(1, Math.max(0, x)),
			y: Math.min(1, Math.max(0, y)),
		};
	}
	return null;
}

/**
 * Normalized crop rectangle on source media (0–1), from item row or data attributes.
 * When set, the tile maps that rect onto the slot with uniform scale (no object-fit: cover).
 *
 * @param {Object} itemData
 * @return {{ x: number, y: number, width: number, height: number }|null}
 */
export function parseItemFocalCrop(itemData) {
	if (!itemData) {
		return null;
	}
	const imgAttrs = itemData.imgAttributes || itemData.img_attributes || {};
	const read = (snake) =>
		parseFloat(
			itemData[snake] ?? imgAttrs[`data-${snake.replace(/_/g, '-')}`]
		);
	const x = read('focal_crop_x');
	const y = read('focal_crop_y');
	const w = read('focal_crop_w');
	const h = read('focal_crop_h');
	if (
		Number.isFinite(x) &&
		Number.isFinite(y) &&
		Number.isFinite(w) &&
		Number.isFinite(h) &&
		w > 0 &&
		h > 0
	) {
		return {
			x: Math.min(1, Math.max(0, x)),
			y: Math.min(1, Math.max(0, y)),
			width: Math.min(1, Math.max(1e-6, w)),
			height: Math.min(1, Math.max(1e-6, h)),
		};
	}
	return null;
}

/** Img class: paired with SCSS so --modula-focal-* beats third-party !important on `.modula img`. */
export const MODULA_IMG_FOCAL_CROP_CLASS = 'modula-item-img--focal-crop';

/** Object-position focal only (no crop rect): disables `.modula img` width/transform transition. */
export const MODULA_IMG_FOCAL_POINT_CLASS = 'modula-item-img--focal-point';

/**
 * Estimate a sizes attribute from gallery column breakpoints (eager images).
 * Lazy images should prefer `auto` instead.
 *
 * @param {Object|null|undefined} config Flat gallery config.
 * @return {string|undefined}
 */
export function estimateGalleryImageSizes(config) {
	if (!config || typeof config !== 'object') {
		return undefined;
	}

	const type = typeof config.type === 'string' ? config.type : '';
	if (['slider', 'showcase', 'story', 'video'].includes(type)) {
		return '100vw';
	}
	if (type === 'template') {
		return '(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw';
	}

	const clampCols = (value, fallback) => {
		const n = parseInt(value, 10);
		if (!Number.isFinite(n) || n < 1) {
			return fallback;
		}
		return Math.min(12, n);
	};

	const enableResponsive = Boolean(config.enableResponsive);
	const colsDesktop = clampCols(config.columns ?? 4, 4);
	const colsTablet = enableResponsive
		? clampCols(config.tabletColumns ?? 2, colsDesktop)
		: colsDesktop;
	const colsMobile = enableResponsive
		? clampCols(config.mobileColumns ?? 1, colsDesktop)
		: colsDesktop;

	const phoneUnder = (() => {
		const n = parseInt(config.treatAsPhoneUnder ?? 600, 10);
		return Number.isFinite(n) && n > 0 ? n : 600;
	})();
	let tabletUnder = (() => {
		const n = parseInt(config.treatAsTabletUnder ?? 1024, 10);
		return Number.isFinite(n) && n > 0 ? n : 1024;
	})();
	if (tabletUnder <= phoneUnder) {
		tabletUnder = phoneUnder + 1;
	}

	const vw = (cols) =>
		`${Math.round((100 / Math.max(1, cols)) * 100) / 100}vw`;

	return `(max-width: ${phoneUnder}px) ${vw(colsMobile)}, (max-width: ${tabletUnder}px) ${vw(colsTablet)}, ${vw(colsDesktop)}`;
}

/**
 * Compute effective sizes attribute for <img>/<source>.
 *
 * Priority: measured/layout slot width → sizes="auto" when lazy → column
 * estimate → server sizes. Never use attachment/file pixel width (that made
 * browsers pick 2×–4× oversized srcset candidates in multi-column grids).
 *
 * @param {Object}                params
 * @param {number|null|undefined} params.slotWidth
 * @param {string}                [params.imageSizes] Server-provided sizes string
 * @param {unknown}               [params.lazyLoad]
 * @param {Object|null|undefined} [params.config]
 * @return {string|undefined} Effective `sizes` string when derivable.
 */
export function getEffectiveSizes({ slotWidth, imageSizes, lazyLoad, config }) {
	if (isValidPositiveNumber(slotWidth)) {
		return `${Math.round(Number(slotWidth))}px`;
	}
	if (isLazyLoadEnabled(lazyLoad)) {
		return 'auto';
	}
	const estimated = estimateGalleryImageSizes(config);
	if (estimated) {
		return estimated;
	}
	return imageSizes || undefined;
}

/**
 * Whether to use legacy image placement (tile + image dimensions available).
 *
 * @param {Object}                       params
 * @param {number|null|undefined}        params.slotWidth
 * @param {number|null|undefined}        params.slotHeight
 * @param {number|string|null|undefined} params.intrinsicWidth
 * @param {number|string|null|undefined} params.intrinsicHeight
 * @return {boolean} True when tile + image dimensions allow legacy placement.
 */
export function useLegacyPlacement({
	slotWidth,
	slotHeight,
	intrinsicWidth,
	intrinsicHeight,
}) {
	return (
		isValidPositiveNumber(slotWidth) &&
		isValidPositiveNumber(slotHeight) &&
		Number(intrinsicWidth) > 0 &&
		Number(intrinsicHeight) > 0
	);
}

/**
 * Picture sources from item data. Uses WordPress srcset (from item processor via wp_calculate_image_srcset)
 * when present; otherwise a single source from item src. The browser picks the right candidate using
 * the sizes attribute (e.g. slot width from getEffectiveSizes).
 *
 * @param {Object} params
 * @param {Object} params.itemData - Item with src, srcset, pictureSources from server
 * @return {{ type: string, srcset: string }[]} Picture `<source>` candidates.
 */
export function getPictureSourcesForItem({ itemData }) {
	return getPictureSources(itemData, getMimeTypeFromUrl);
}

/**
 * Img style: legacy placement (position + top/left/width/height) or object-fit cover.
 *
 * @param {Object}                        params
 * @param {boolean}                       params.useLegacy
 * @param {number|null|undefined}         params.slotWidth
 * @param {number|null|undefined}         params.slotHeight
 * @param {number|string}                 params.intrinsicWidth
 * @param {number|string}                 params.intrinsicHeight
 * @param {string}                        params.valign
 * @param {string}                        params.halign
 * @param {{ x: number, y: number }|null} [params.focalPoint]
 * @param {{ x: number, y: number, width: number, height: number }|null} [params.focalCrop] 0–1 rect on source (zoom + pan from editor).
 * @param {boolean}                       [params.captionBelowNaturalFlow] Below-image captions without a fixed tile height (masonry, etc.).
 * @param {'cover'|'contain'}             [params.objectFit] Fill mode when not using legacy placement (default cover).
 * @param {string}                        [params.objectPosition] CSS object-position (default center center).
 * @return {Object} React inline style for the `<img>`.
 */
export function getImgStyleForItem({
	useLegacy,
	slotWidth,
	slotHeight,
	intrinsicWidth,
	intrinsicHeight,
	valign,
	halign,
	focalPoint = null,
	focalCrop = null,
	captionBelowNaturalFlow = false,
	objectFit = 'cover',
	objectPosition = 'center center',
}) {
	if (focalCrop) {
		const x = focalCrop.x;
		const y = focalCrop.y;
		const w = focalCrop.width;
		const h = focalCrop.height;
		const iw = Number(intrinsicWidth);
		const ih = Number(intrinsicHeight);
		const sw = Number(slotWidth);
		const sh = Number(slotHeight);

		/** Uniform scale so crop region covers the tile (same math as zoom-to-crop, no stretching). */
		if (
			iw > 0 &&
			ih > 0 &&
			Number.isFinite(sw) &&
			Number.isFinite(sh) &&
			sw > 0 &&
			sh > 0
		) {
			const cropWpx = w * iw;
			const cropHpx = h * ih;
			const k = Math.max(sw / cropWpx, sh / cropHpx);
			const imgW = k * iw;
			const imgH = k * ih;
			const imgL = -k * x * iw;
			const imgT = -k * y * ih;
			return {
				position: 'absolute',
				left: imgL,
				top: imgT,
				width: imgW,
				height: imgH,
				maxWidth: 'none',
				// Box matches bitmap aspect — fill equals uniform scale (unlike object-fit: cover on the slot).
				objectFit: 'fill',
				imageRendering: 'smooth',
				// Mirrored for .modula img… { width:100% !important } in themes — see index.scss safety net.
				'--modula-focal-w': `${imgW}px`,
				'--modula-focal-h': `${imgH}px`,
				'--modula-focal-left': `${imgL}px`,
				'--modula-focal-top': `${imgT}px`,
			};
		}

		/**
		 * No tile / intrinsic dims yet: scale so crop width matches container width, pan with % translate.
		 * Parent must be overflow:hidden + definite size (pictureAbsoluteFill in markup).
		 */
		const tf = `translate(-${x * 100}%, -${y * 100}%)`;
		return {
			position: 'absolute',
			left: 0,
			top: 0,
			width: `${100 / w}%`,
			height: 'auto',
			maxWidth: 'none',
			objectFit: 'fill',
			transform: tf,
			imageRendering: 'smooth',
			'--modula-focal-w': `${100 / w}%`,
			'--modula-focal-h': 'auto',
			'--modula-focal-left': '0',
			'--modula-focal-top': '0',
			'--modula-focal-transform': tf,
		};
	}
	if (focalPoint) {
		return {
			width: '100%',
			height: '100%',
			objectFit: 'cover',
			objectPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%`,
			imageRendering: 'smooth',
		};
	}
	if (captionBelowNaturalFlow) {
		return {
			display: 'block',
			width: '100%',
			height: 'auto',
			maxWidth: '100%',
			imageRendering: 'smooth',
		};
	}
	if (!useLegacy) {
		const fit = objectFit === 'contain' ? 'contain' : 'cover';
		return {
			width: '100%',
			height: '100%',
			objectFit: fit,
			objectPosition,
			// Prefer smooth scaling to avoid oversharpened look when image fills the slot
			imageRendering: 'smooth',
		};
	}
	return computeLegacyImageStyle(
		Math.round(Number(slotWidth)),
		Math.round(Number(slotHeight)),
		Number(intrinsicWidth),
		Number(intrinsicHeight),
		valign,
		halign
	);
}

/**
 * Build img element attributes (src, sizes, dimensions, style, etc.).
 *
 * @param {Object}      params
 * @param {Object}      params.item            - Prepared item (prepareItemData)
 * @param {Object}      params.itemData        - Raw item data
 * @param {string}      params.imageSrc
 * @param {string}      params.effectiveSizes
 * @param {Object}      params.imgStyle        - From getImgStyleForItem
 * @param {number|null} params.intrinsicWidth
 * @param {number|null} params.intrinsicHeight
 * @param {boolean}     params.lazyLoad
 * @param {string}      params.imageSrcset
 * @return {Object} Props for <img>
 */
export function buildImgAttrs({
	item,
	itemData,
	imageSrc,
	effectiveSizes,
	imgStyle,
	intrinsicWidth,
	intrinsicHeight,
	lazyLoad,
	imageSrcset,
}) {
	const letterboxContainActive = itemUsesCustomGridLetterbox(itemData);
	const focalCropActive = parseItemFocalCrop(itemData);
	const focalPointActive =
		!letterboxContainActive &&
		!focalCropActive &&
		Boolean(parseItemFocalPoint(itemData));
	const focalTransitionOff =
		letterboxContainActive || focalCropActive || focalPointActive;
	const lazyEnabled = isLazyLoadEnabled(lazyLoad);
	const imgAttrs = {
		...mergeReactClassNameProps(
			normalizeReactDomProps(spreadAttrs(item.imgAttributes)),
			[
				...(item.imgClasses || []),
				...(letterboxContainActive
					? [MODULA_IMG_LETTERBOX_CONTAIN_CLASS]
					: []),
				...(focalCropActive ? [MODULA_IMG_FOCAL_CROP_CLASS] : []),
				...(focalPointActive ? [MODULA_IMG_FOCAL_POINT_CLASS] : []),
			]
		),
		loading: lazyEnabled ? 'lazy' : 'eager',
		decoding: 'async',
		alt: itemData?.alt || item?.title || '',
		src: imageSrc,
		// Inline beats theme `transition: all` on img; object-position is interpolable in CSS.
		style: focalTransitionOff
			? {
					...imgStyle,
					transition: 'none',
					...(letterboxContainActive &&
					typeof imgStyle?.objectPosition === 'string'
						? {
								'--modula-letterbox-position':
									imgStyle.objectPosition,
							}
						: {}),
				}
			: imgStyle,
	};
	delete imgAttrs.srcset;
	delete imgAttrs.srcSet;
	// HTML width/height attrs fight CSS layout for focal-crop (scaled draw rect ≠ intrinsic).
	if (intrinsicWidth && intrinsicHeight && !focalCropActive) {
		imgAttrs.width = Number(intrinsicWidth);
		imgAttrs.height = Number(intrinsicHeight);
	}
	if (effectiveSizes) {
		imgAttrs.sizes = effectiveSizes;
	}
	const fullUrl =
		itemData?.image_full ||
		itemData?.imageFull ||
		item?.imgAttributes?.['data-full'] ||
		itemData?.img_attributes?.['data-full'];
	if (fullUrl) {
		imgAttrs['data-full'] = fullUrl;
	}
	return imgAttrs;
}
