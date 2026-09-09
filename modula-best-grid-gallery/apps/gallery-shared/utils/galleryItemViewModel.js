/**
 * Item-tile view model — public data entry for a ready gallery item.
 *
 * Thin hosts (GalleryItem, SliderItem, StoryItem) and Showcase’s strip
 * should call `getItemTileViewModel` / `getGalleryItemViewModel`. Layouts must
 * not treat `prepareItemData` as their API. Markup stays a separate step.
 *
 * @package
 */

import {
	prepareItemData,
	isGalleryItemHiddenFromLightbox,
} from './prepareItemData';
import {
	mergeReactClassNameProps,
	normalizeReactDomProps,
	spreadAttrs,
} from './attributeUtils';
import { getMimeTypeFromUrl } from './imageMime';
import {
	getEffectiveSizes,
	useLegacyPlacement as getLegacyPlacementMode,
	getPictureSourcesForItem,
	getImgStyleForItem,
	parseItemFocalPoint,
	parseItemFocalCrop,
	buildImgAttrs,
} from './galleryItemImage';
import {
	isCaptionBelowImage,
	isCompactCaptionPopoverEnabled,
	resolveBelowImageAlignment,
	resolveBelowImagePadding,
	resolveBelowImageSpacing,
	resolveCompactCaptionMinSizeFromSource,
	resolveGalleryTypeFromSource,
} from './captionPlacement';
import {
	resolveGalleryItemPlaceholderSrc,
	shouldUseGalleryItemPlaceholder,
} from './galleryItemPlaceholder';
import { resolveGalleryItemIntrinsicDimensions } from './galleryItemIntrinsicDimensions';
import { fitGridContainObjectPositionFromConfig } from './fitGridImageAlign';
import {
	customGridLetterboxObjectPositionFromItem,
	parseItemTileImageFit,
	TILE_IMAGE_FIT_CONTAIN,
} from './customGridTileImageFit';
import { resolveGalleryItemLink } from './resolveGalleryItemLink';
import { getItemVideoUrl } from '../video/videoGalleryModel';

/**
 * @typedef {Object} GalleryItemViewModelOptions
 * @property {Object|null} [style]           - Optional inline styles for outer wrapper.
 * @property {string}      [extraClassName]  - Extra class names for the tile.
 * @property {number}      [slotWidth]       - Tile width for legacy placement / sizes.
 * @property {number}      [slotHeight]      - Tile height for legacy placement.
 * @property {boolean}     [fillSlot]        - When true, image covers the slot.
 * @property {boolean}     [renderLinks]   - Output tile link overlay on the public frontend.
 * @property {boolean}     [forceLinkNewTab] - Force target=_blank on simple links (visitor hosts may set).
 * @property {boolean}     [stripHoverBuilderClasses] - Remove hover-builder runtime classes from tile.
 * @property {number}      [deeplinkIndex] - 0-based index among lightbox slides for social deeplink URLs.
 */

/**
 * Build everything needed to render a gallery item shell.
 *
 * @param {Object}                      itemData - Raw item from store.
 * @param {Object}                      config   - Gallery config.
 * @param {GalleryItemViewModelOptions} options  - Layout and link options.
 * @return {Object|null} View model or null if item should not render.
 */
export function getGalleryItemViewModel(itemData, config, options = {}) {
	const {
		style = null,
		extraClassName = '',
		slotWidth,
		slotHeight,
		fillSlot = false,
		renderLinks = false,
		forceLinkNewTab = false,
		stripHoverBuilderClasses = false,
		deeplinkIndex,
	} = options;

	const imgAttrSource =
		itemData?.imgAttributes || itemData?.img_attributes || {};
	/*
	 * Custom grid: Redux / REST `width` & `height` on the row are tile span in grid
	 * units (data-width / data-height), not bitmap size. Focal crop math in
	 * getImgStyleForItem needs real attachment dimensions from img attributes.
	 */
	const { width: intrinsicWidth, height: intrinsicHeight } =
		resolveGalleryItemIntrinsicDimensions(itemData, config);

	const legacyPlacement = getLegacyPlacementMode({
		slotWidth,
		slotHeight,
		intrinsicWidth,
		intrinsicHeight,
	});
	const focalCropRaw = parseItemFocalCrop(itemData);
	const focalPointRaw = focalCropRaw ? null : parseItemFocalPoint(itemData);

	const galleryType = resolveGalleryTypeFromSource(config);
	const isFitGrid = galleryType === 'fit-grid' && fillSlot;
	const isCustomGridLetterbox =
		galleryType === 'custom-grid' &&
		fillSlot &&
		parseItemTileImageFit(itemData) === TILE_IMAGE_FIT_CONTAIN;
	const isUniformGrid = galleryType === 'uniform-grid' && fillSlot;
	const suppressFocalCrop = isFitGrid || isCustomGridLetterbox;
	const suppressFocalPointCover = isFitGrid || isCustomGridLetterbox;
	const focalCrop = suppressFocalCrop ? null : focalCropRaw;
	const focalPoint = suppressFocalPointCover ? null : focalPointRaw;
	let resolvedObjectFit = 'cover';
	let resolvedObjectPosition = 'center center';
	if (isFitGrid) {
		resolvedObjectFit = 'contain';
		resolvedObjectPosition = fitGridContainObjectPositionFromConfig(config);
	} else if (isCustomGridLetterbox) {
		resolvedObjectFit = 'contain';
		resolvedObjectPosition =
			customGridLetterboxObjectPositionFromItem(itemData);
	} else if (isUniformGrid) {
		resolvedObjectFit = 'cover';
	}

	const useLegacy = !fillSlot && legacyPlacement && !focalPoint && !focalCrop;

	const item = prepareItemData(itemData, config, { deeplinkIndex });
	if (!item) {
		return null;
	}

	const imageSrc =
		itemData?.src ||
		itemData?.thumbnail ||
		itemData?.url ||
		itemData?.full ||
		'';
	const resolvedPlaceholderSrc = resolveGalleryItemPlaceholderSrc(
		itemData,
		imageSrc
	);
	const placeholderSrc = shouldUseGalleryItemPlaceholder(
		resolvedPlaceholderSrc,
		imageSrc
	)
		? resolvedPlaceholderSrc
		: '';
	const imageSrcset = itemData?.srcset || '';
	const imageSizes = itemData?.sizes || '';

	const effectiveSizes = getEffectiveSizes({
		slotWidth,
		imageSizes,
		lazyLoad: item.lazyLoad ?? config?.lazyLoad,
		config,
	});

	const valign =
		itemData?.valign ?? item.imgAttributes?.['data-valign'] ?? 'middle';
	const halign =
		itemData?.halign ?? item.imgAttributes?.['data-halign'] ?? 'center';

	const captionBelowImage = isCaptionBelowImage(config);
	const compactCaptionPopover = isCompactCaptionPopoverEnabled(config);
	const compactCaptionMinSize =
		resolveCompactCaptionMinSizeFromSource(config);
	const polaroidCaptionInChin =
		captionBelowImage &&
		resolveGalleryTypeFromSource(config) === 'polaroid';
	const belowImageAlignment = resolveBelowImageAlignment(config);
	const belowImageSpacing = polaroidCaptionInChin
		? 0
		: resolveBelowImageSpacing(config);
	const belowImagePadding = polaroidCaptionInChin
		? 0
		: resolveBelowImagePadding(config);
	const tileHasFixedHeight =
		fillSlot || Boolean(focalCrop) || style?.height === '100%';
	const captionBelowNaturalFlow = captionBelowImage && !tileHasFixedHeight;
	/** Justified (etc.): slot height sizes the image area; caption hangs below the tile. */
	const captionBelowSlotImage =
		captionBelowImage && !tileHasFixedHeight && Number(slotHeight) > 0;
	const imgStyle = getImgStyleForItem({
		useLegacy,
		slotWidth,
		slotHeight,
		intrinsicWidth,
		intrinsicHeight,
		valign,
		halign,
		focalPoint,
		focalCrop,
		captionBelowNaturalFlow,
		objectFit: resolvedObjectFit,
		objectPosition: resolvedObjectPosition,
	});

	const pictureSources = getPictureSourcesForItem({ itemData });

	const imgAttrs = buildImgAttrs({
		item,
		itemData,
		imageSrc,
		effectiveSizes,
		imgStyle,
		intrinsicWidth,
		intrinsicHeight,
		lazyLoad: item.lazyLoad,
		imageSrcset,
	});

	const itemClasses = [...(item.itemClasses || [])];
	const cleanedItemClasses = (
		stripHoverBuilderClasses
			? itemClasses.filter((cls) => {
					const name = String(cls || '');
					return (
						!name.startsWith('modula-hover-v2') &&
						!name.startsWith('modula-hover-card--') &&
						!name.startsWith('modula-hover-enter--') &&
						!name.startsWith('modula-hover-exit--') &&
						!name.startsWith('modula-hover-visibility--') &&
						!name.startsWith('modula-hover-graphic')
					);
				})
			: itemClasses
	).filter(
		(cls) =>
			cls !== 'modula-caption-below-image' &&
			cls !== 'modula-caption-below-image--fixed-tile'
	);
	if (captionBelowImage) {
		cleanedItemClasses.push('modula-caption-below-image');
		if (tileHasFixedHeight) {
			cleanedItemClasses.push('modula-caption-below-image--fixed-tile');
		} else if (captionBelowSlotImage) {
			cleanedItemClasses.push('modula-caption-below-image--slot-image');
		}
	}
	if (extraClassName) {
		cleanedItemClasses.push(extraClassName);
	}

	const linkResolution = resolveGalleryItemLink(itemData, config, {
		// Prefer full-size URL for direct links; fall back to the display src.
		imageFull:
			(typeof itemData?.url === 'string' && itemData.url.trim()) ||
			(typeof itemData?.full === 'string' && itemData.full.trim()) ||
			imageSrc,
		forceNewTab: forceLinkNewTab,
	});

	/*
	 * Pro Lightbox_Enhancer historically forced modula-simple-link when an
	 * image had a custom URL, which skipped Fancybox. Strip it for fancybox
	 * so the tile opens the lightbox; URL is handled inside the lightbox.
	 */
	if (!linkResolution.isSimpleLink) {
		for (let i = cleanedItemClasses.length - 1; i >= 0; i--) {
			if (cleanedItemClasses[i] === 'modula-simple-link') {
				cleanedItemClasses.splice(i, 1);
			}
		}
	}

	const itemAttrs = mergeReactClassNameProps(
		normalizeReactDomProps(spreadAttrs(item.itemAttributes || {})),
		cleanedItemClasses
	);

	const linkAttrs = normalizeReactDomProps(
		spreadAttrs(item.linkAttributes || {})
	);
	if (linkResolution.showLink && linkResolution.href) {
		linkAttrs.href = linkResolution.href;
		if (linkResolution.target) {
			linkAttrs.target = linkResolution.target;
			linkAttrs.rel = 'noopener noreferrer';
		} else {
			delete linkAttrs.target;
			delete linkAttrs.rel;
		}
		if (linkResolution.role) {
			linkAttrs.role = linkResolution.role;
		} else {
			delete linkAttrs.role;
		}
	}
	const tileVideoUrl = getItemVideoUrl(itemData);
	if (tileVideoUrl && linkResolution.showLink) {
		linkAttrs['data-video-url'] = tileVideoUrl;
	} else {
		delete linkAttrs['data-video-url'];
	}

	const linkHref =
		linkAttrs.href !== undefined && linkAttrs.href !== null
			? linkAttrs.href
			: '#';

	let linkClasses = [...(item.linkClasses || [])];
	if (linkResolution.isSimpleLink) {
		if (!linkClasses.includes('modula-simple-link')) {
			linkClasses.push('modula-simple-link');
		}
	} else {
		linkClasses = linkClasses.filter((cls) => cls !== 'modula-simple-link');
	}
	if (isGalleryItemHiddenFromLightbox(itemData)) {
		if (!linkClasses.includes('modula-no-follow')) {
			linkClasses.push('modula-no-follow');
		}
	} else {
		linkClasses = linkClasses.filter((cls) => cls !== 'modula-no-follow');
	}

	const showLink =
		renderLinks && linkResolution.showLink && Boolean(linkResolution.href);

	const fallbackSource =
		pictureSources.length === 0
			? [
					{
						type: getMimeTypeFromUrl(imageSrc),
						srcset: `${imageSrc} 1x`,
					},
				]
			: pictureSources;

	/** Picture fills tile and clips img when using legacy, fillSlot, or focal crop (absolute crop math). */
	const pictureAbsoluteFill = captionBelowImage
		? tileHasFixedHeight || captionBelowSlotImage
		: useLegacy || fillSlot || Boolean(focalCrop);
	const hasFocalCrop = Boolean(focalCrop);

	/**
	 * Masonry / fluid columns: no slot size — absolute picture needs a definite tile box.
	 * Use crop-rect aspect (px) so focal-crop tiles reserve height from width.
	 * Skip when the layout already passed slot dimensions (creative, custom grid, etc.).
	 */
	const hasSlotDimensions = Number(slotWidth) > 0 && Number(slotHeight) > 0;
	let mergedStyle = {
		...(style || {}),
	};
	if (
		pictureAbsoluteFill &&
		!useLegacy &&
		!fillSlot &&
		!hasSlotDimensions &&
		focalCrop &&
		Number(intrinsicWidth) > 0 &&
		Number(intrinsicHeight) > 0
	) {
		const iw = Number(intrinsicWidth);
		const ih = Number(intrinsicHeight);
		const arW = focalCrop.width * iw;
		const arH = focalCrop.height * ih;
		if (arW > 0 && arH > 0) {
			mergedStyle = {
				...mergedStyle,
				aspectRatio: `${arW} / ${arH}`,
			};
		}
	}
	return {
		item,
		style: mergedStyle,
		itemAttrs,
		itemClasses: cleanedItemClasses,
		linkAttrs,
		linkHref,
		showLink,
		isSimpleLink: linkResolution.isSimpleLink,
		linkClasses,
		imageSrc,
		placeholderSrc,
		effectiveSizes,
		useLegacy,
		fillSlot,
		customGridLetterbox: isCustomGridLetterbox,
		pictureAbsoluteFill,
		hasFocalCrop,
		fallbackSource,
		imgAttrs,
		captionBelowImage,
		compactCaptionPopover,
		compactCaptionMinSize,
		belowImageAlignment,
		belowImageSpacing,
		belowImagePadding,
		polaroidCaptionInChin,
		tileHasFixedHeight,
		slotWidth: Number(slotWidth) > 0 ? Number(slotWidth) : 0,
		slotHeight: Number(slotHeight) > 0 ? Number(slotHeight) : 0,
		stripHoverBuilderClasses,
	};
}

/**
 * Public alias — item-tile view model (glossary: Item-tile view model).
 *
 * @type {typeof getGalleryItemViewModel}
 */
export const getItemTileViewModel = getGalleryItemViewModel;
