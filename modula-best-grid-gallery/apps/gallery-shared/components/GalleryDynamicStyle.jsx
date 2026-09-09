import { useSelector } from 'react-redux';
import {
	MODULA_LIGHTBOX_CAPTION_GUTTER,
	resolveLightboxCaptionPositionAlignment,
} from '../utils/lightboxSettingsToFancyboxOpts';
import { galleryRootSelector } from '../utils/galleryRootSelector';
import { getForcedPreviewViewport } from '../utils/resolvePreviewViewport';
import { buildHoverCursorCss } from '../utils/hoverCursorCss';
import { resolveHoverDimCssVars } from '../utils/resolveHoverDimCssVars';
import { useWpAttachmentSourceUrl } from '../hooks/useWpAttachmentSourceUrl';
import {
	isCaptionBelowImage,
	resolveBelowImagePreviewTextColor,
	resolveBelowImageTextColor,
} from '../utils/captionPlacement';
import {
	isSliderCaptionInside,
	normalizeSliderCaptionPosition,
} from '../utils/sliderCaptionPosition';
import { isGalleryTypeWithoutLoadingEffects } from '../constants/galleryLayoutDefaults';
import {
	resolvePolaroidChinInset,
	resolvePolaroidEffectiveChinHeight,
} from '../utils/polaroidCaptionChin';
import { selectGalleryDynamicStyleInputs } from '../store/selectors/galleryShellSelectors';
import { isSettingsEditorPreview } from '../utils/displayContext';
import { buildFilterBarDynamicCss } from '../utils/buildFilterBarDynamicCss';
import { buildPaginationDynamicCss } from '../utils/buildPaginationDynamicCss';
import { resolveGalleryWidthCss } from '../utils/resolveGalleryWidthCss';
import { clampMasonryGalleryWidth } from '../utils/clampMasonryGalleryWidth';

function safeNumber(value) {
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

function safeString(value) {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Build dynamic CSS from grouped settings + derived config (legacy generate_gallery_css parity).
 */
export default function GalleryDynamicStyle() {
	const {
		galleryId,
		groupedCaptions,
		groupedStyle,
		groupedSocial,
		groupedLoading,
		groupedFilters,
		groupedPagination,
		groupedLightbox,
		groupedVideo,
		groupedHover,
		metadata,
		config,
	} = useSelector(selectGalleryDynamicStyleInputs);

	const hoverChangeCursor =
		config.hoverChangeCursor !== false &&
		groupedHover.changeCursor !== false;
	const hoverCursor =
		safeString(config.hoverCursor) ||
		safeString(groupedHover.cursor) ||
		'zoom-in';
	const hoverUploadCursorId =
		parseInt(
			config.hoverUploadCursor ?? groupedHover.uploadCursor ?? 0,
			10
		) || 0;
	const isSettingsEditorPreviewContext = isSettingsEditorPreview(metadata);
	const fetchedCustomCursorUrl = useWpAttachmentSourceUrl(
		galleryId &&
			hoverChangeCursor &&
			hoverCursor === 'custom' &&
			isSettingsEditorPreviewContext
			? hoverUploadCursorId
			: 0
	);

	if (!galleryId) {
		return null;
	}

	const root = galleryRootSelector(galleryId);
	const bootstrapCustomCursorUrl =
		safeString(metadata.hoverCustomCursorUrl) ||
		safeString(config.hoverCustomCursorUrl);
	const customCursorUrl =
		hoverChangeCursor && hoverCursor === 'custom'
			? fetchedCustomCursorUrl || bootstrapCustomCursorUrl
			: '';
	const lightboxTypeForCursor =
		safeString(groupedLightbox.lightbox) || safeString(config.lightbox);

	let css = buildHoverCursorCss(root, {
		cursor: hoverCursor,
		customCursorUrl,
		lightbox: lightboxTypeForCursor,
		changeCursor: hoverChangeCursor,
	});

	const dimVars = resolveHoverDimCssVars(
		safeString(config.hoverColor) || safeString(groupedHover.hoverColor),
		config.hoverOpacity ?? groupedHover.hoverOpacity
	);
	const builder = groupedHover.builder;
	const dimOn =
		groupedHover.dimOverlay === true ||
		groupedHover.dimOverlay === 1 ||
		groupedHover.dimOverlay === '1' ||
		(builder &&
			typeof builder === 'object' &&
			(builder.dimOverlay === true ||
				builder.dimOverlay === 1 ||
				builder.dimOverlay === '1' ||
				builder.cardTreatment === 'dim'));
	if (dimOn && dimVars) {
		css += `${root}{--modula-hover-overlay-tint:${dimVars.tint};--modula-hover-dim-active-opacity:${dimVars.opacity};}`;
	}

	const titleSize =
		safeNumber(config.titleFontSize) ??
		safeNumber(groupedCaptions.titleFontSize);
	const captionSize =
		safeNumber(config.captionFontSize) ??
		safeNumber(groupedCaptions.captionFontSize);
	const mobileTitleSize =
		safeNumber(config.mobileTitleFontSize) ??
		safeNumber(groupedCaptions.mobileTitleFontSize);
	const mobileCaptionSize =
		safeNumber(config.mobileCaptionFontSize) ??
		safeNumber(groupedCaptions.mobileCaptionFontSize);
	const titleColor =
		safeString(config.titleColor) || safeString(groupedCaptions.titleColor);
	const captionColor =
		safeString(config.captionColor) ||
		safeString(groupedCaptions.captionColor);
	const titleWeight =
		safeString(config.titleFontWeight) ||
		safeString(groupedCaptions.titleFontWeight);
	const captionWeight =
		safeString(config.captionFontWeight) ||
		safeString(groupedCaptions.captionFontWeight);
	const contentPlacement =
		safeString(groupedCaptions.contentPlacement) ||
		safeString(config.contentPlacement) ||
		'inside-image';
	const captionBelowImage = isCaptionBelowImage({
		contentPlacement,
		type: config.type,
	});
	const sliderCaptionOutside =
		safeString(config.type) === 'slider' &&
		!!config.sliderImageInfo &&
		!isSliderCaptionInside(
			normalizeSliderCaptionPosition(config.sliderImageInfoPosition)
		);
	const resolveSliderTitleColor = (color) => {
		if (!color) {
			return color;
		}
		if (!sliderCaptionOutside) {
			return color;
		}
		return isSettingsEditorPreviewContext
			? resolveBelowImagePreviewTextColor(color, 'title')
			: resolveBelowImageTextColor(color, '#1e1e1e');
	};
	const resolveSliderCaptionColor = (color) => {
		if (!color) {
			return color;
		}
		if (!sliderCaptionOutside) {
			return color;
		}
		return isSettingsEditorPreviewContext
			? resolveBelowImagePreviewTextColor(color, 'caption')
			: resolveBelowImageTextColor(color, '#50575e');
	};
	const overlayTitleSel = `${root} .modula-item .figc .modula-title`;
	const overlayCaptionSel = `${root} .modula-item .figc .jtg-description,${root} .modula-item .figc p.description`;
	const belowTitleSel = `${root} .modula-item .modula-item-below-caption .modula-title`;
	const belowCaptionSel = `${root} .modula-item .modula-item-below-caption .jtg-description`;
	const sliderTitleSel = `${root} .modula-slider .slider-image-info .modula-title`;
	const sliderCaptionSel = `${root} .modula-slider .slider-image-info .description`;
	const storyTitleSel = `${root} .modula-story-caption__title`;
	const storyCaptionSel = `${root} .modula-story-caption__desc`;
	const titleSels = `${overlayTitleSel},${belowTitleSel},${sliderTitleSel},${storyTitleSel}`;
	const captionSels = `${overlayCaptionSel},${belowCaptionSel},${sliderCaptionSel},${storyCaptionSel}`;

	if (titleSize && titleSize > 0) {
		css += `${titleSels}{font-size:${Math.round(titleSize)}px;}`;
	}
	if (captionSize && captionSize > 0) {
		css += `${captionSels}{font-size:${Math.round(captionSize)}px;}`;
	}
	const forcedViewport = getForcedPreviewViewport(config);

	if (mobileTitleSize && mobileTitleSize > 0) {
		if (forcedViewport === 'mobile') {
			css += `${titleSels}{font-size:${Math.round(mobileTitleSize)}px;}`;
		} else if (!forcedViewport) {
			css += `@media screen and (max-width:768px){${titleSels}{font-size:${Math.round(
				mobileTitleSize
			)}px;}}`;
		}
	}
	if (mobileCaptionSize && mobileCaptionSize > 0) {
		if (forcedViewport === 'mobile') {
			css += `${captionSels}{font-size:${Math.round(
				mobileCaptionSize
			)}px;}`;
		} else if (!forcedViewport) {
			css += `@media screen and (max-width:768px){${captionSels}{font-size:${Math.round(
				mobileCaptionSize
			)}px;}}`;
		}
	}
	if (captionColor) {
		css += `${overlayCaptionSel}{color:${captionColor};}`;
		css += `${storyCaptionSel}{color:${captionColor};}`;
		css += `${sliderCaptionSel}{color:${resolveSliderCaptionColor(
			captionColor
		)};}`;
		if (captionBelowImage) {
			const belowCaptionTextColor = isSettingsEditorPreviewContext
				? resolveBelowImagePreviewTextColor(captionColor, 'caption')
				: resolveBelowImageTextColor(captionColor, '#50575e');
			css += `${belowCaptionSel}{color:${belowCaptionTextColor};}`;
		}
	}
	if (titleColor) {
		css += `${overlayTitleSel}{color:${titleColor};}`;
		css += `${storyTitleSel}{color:${titleColor};}`;
		css += `${sliderTitleSel}{color:${resolveSliderTitleColor(titleColor)};}`;
		if (captionBelowImage) {
			const belowTitleTextColor = isSettingsEditorPreviewContext
				? resolveBelowImagePreviewTextColor(titleColor, 'title')
				: resolveBelowImageTextColor(titleColor, '#1e1e1e');
			css += `${belowTitleSel}{color:${belowTitleTextColor};}`;
		}
	} else if (captionColor) {
		css += `${overlayTitleSel}{color:${captionColor};}`;
		css += `${storyTitleSel}{color:${captionColor};}`;
		css += `${sliderTitleSel}{color:${resolveSliderTitleColor(captionColor)};}`;
		if (captionBelowImage) {
			const belowTitleTextColor = isSettingsEditorPreviewContext
				? resolveBelowImagePreviewTextColor(captionColor, 'title')
				: resolveBelowImageTextColor(captionColor, '#1e1e1e');
			css += `${belowTitleSel}{color:${belowTitleTextColor};}`;
		}
	}
	if (titleWeight && titleWeight !== 'default') {
		css += `${titleSels}{font-weight:${titleWeight};}`;
	}
	if (
		captionWeight &&
		captionWeight !== 'default' &&
		captionWeight !== 'normal'
	) {
		css += `${captionSels}{font-weight:${captionWeight};}`;
	}

	if (captionBelowImage) {
		const belowAlign =
			safeString(groupedCaptions.belowImageAlignment) ||
			safeString(config.belowImageAlignment) ||
			'left';
		const belowSpacing = Math.min(
			48,
			Math.max(
				0,
				safeNumber(groupedCaptions.belowImageSpacing) ??
					safeNumber(config.belowImageSpacing) ??
					8
			)
		);
		const belowPadding = Math.min(
			48,
			Math.max(
				0,
				safeNumber(groupedCaptions.belowImagePadding) ??
					safeNumber(config.belowImagePadding) ??
					0
			)
		);
		css += `${root} .modula-item.modula-caption-below-image{display:flex;flex-direction:column;min-width:0;overflow:visible;}`;
		css += `${root} .modula-item.modula-caption-below-image .modula-item-image-area>.modula-item-hover-media{position:relative;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;transform-origin:center center;z-index:0;}`;
		css += `${root} .modula-item.modula-caption-below-image .modula-item-image-area>.modula-item-hover-media:has(.modula-item-picture-stack--fill-parent){position:absolute;inset:0;}`;
		css += `${root} .modula-item.modula-caption-below-image.modula-caption-below-image--fixed-tile{height:100%;min-height:0;}`;
		css += `${root} .modula-item.modula-caption-below-image .modula-item-image-area{position:relative;width:100%;overflow:hidden;}`;
		css += `${root} .modula-item.modula-caption-below-image.modula-caption-below-image--fixed-tile .modula-item-image-area:not(.modula-uniform-grid__media){flex:1 1 0;min-height:0;}`;
		css += `${root} .modula-item.modula-caption-below-image .modula-item-image-area .modula-item-picture:not(.modula-item-picture--focal-crop){position:relative;inset:auto;width:100%;height:auto;overflow:visible;}`;
		css += `${root} .modula-item.modula-caption-below-image .modula-item-image-area .modula-item-picture:not(.modula-item-picture--focal-crop) img,${root} .modula-item.modula-caption-below-image .modula-item-image-area .modula-item-picture:not(.modula-item-picture--focal-crop) img.pic{display:block;width:100%;height:auto;max-width:100%;position:relative;object-fit:initial;}`;
		css += `${root} .modula-item.modula-caption-below-image.modula-caption-below-image--fixed-tile .modula-item-image-area .modula-item-picture{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;}`;
		const equalCellCaptionFit =
			safeString(config.type) === 'fit-grid' ? 'contain' : 'cover';
		const equalCellCaptionObjectPosition =
			equalCellCaptionFit === 'contain'
				? safeString(config.fitGridContainObjectPosition) ||
					'center center'
				: 'center center';
		css += `${root} .modula-item.modula-caption-below-image.modula-caption-below-image--fixed-tile .modula-item-image-area .modula-item-picture:not(.modula-item-picture--focal-crop) img,${root} .modula-item.modula-caption-below-image.modula-caption-below-image--fixed-tile .modula-item-image-area .modula-item-picture:not(.modula-item-picture--focal-crop) img.pic{width:100%;height:100%;object-fit:${equalCellCaptionFit};object-position:${equalCellCaptionObjectPosition};}`;
		css += `${root} .modula-item.modula-caption-below-image .modula-item-below-caption{flex:0 0 auto;width:100%;}`;
		css += `${root} .modula-item.modula-caption-below-image .modula-item-below-caption{margin-top:${belowSpacing}px;padding:${belowPadding}px;text-align:${belowAlign};}`;
		if (safeString(config.type) === 'polaroid') {
			const polaroidChinHeight = resolvePolaroidEffectiveChinHeight(
				safeNumber(config.polaroid?.chinHeight) ?? 36
			);
			const polaroidFramePadding = Math.min(
				28,
				Math.max(4, safeNumber(config.polaroid?.framePadding) ?? 12)
			);
			const polaroidChinInset =
				resolvePolaroidChinInset(polaroidFramePadding);
			const polaroidItemSel = `${root} .modula-polaroid-gallery--caption-in-chin .modula-polaroid-frame__media .modula-item.modula-caption-below-image`;
			const polaroidBelowSel = `${polaroidItemSel} .modula-item-below-caption--polaroid-chin`;
			const polaroidTitleSel = `${polaroidBelowSel} .modula-title`;
			const polaroidCaptionSel = `${polaroidBelowSel} .jtg-description,${polaroidBelowSel} .jtg-description p`;
			css += `${polaroidItemSel}{display:grid;grid-template-rows:minmax(0,1fr) ${polaroidChinHeight}px;height:100%;min-height:0;}`;
			css += `${polaroidItemSel} .modula-item-image-area{grid-row:1;flex:none;min-height:0;overflow:hidden;}`;
			css += `${polaroidBelowSel}{grid-row:2;flex:none;height:${polaroidChinHeight}px;max-height:${polaroidChinHeight}px;margin-top:0;padding:4px ${polaroidChinInset}px ${polaroidChinInset}px;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;gap:1px;text-align:${belowAlign};line-height:1.25;font-size:12px;}`;
			const polaroidTitleSize =
				titleSize && titleSize > 0
					? Math.min(Math.round(titleSize), 13)
					: 12;
			const polaroidCaptionSize =
				captionSize && captionSize > 0
					? Math.min(Math.round(captionSize), 13)
					: 12;
			css += `${polaroidTitleSel},${polaroidCaptionSel}{margin:0;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;line-clamp:1;}`;
			css += `${polaroidTitleSel}{font-size:${polaroidTitleSize}px;}`;
			css += `${polaroidCaptionSel}{font-size:${polaroidCaptionSize}px;}`;
			css += `${polaroidBelowSel}:not(:has(.modula-title)) .jtg-description,${polaroidBelowSel}:not(:has(.modula-title)) .jtg-description p{-webkit-line-clamp:2;line-clamp:2;}`;
			css += `${polaroidBelowSel}:not(:has(.jtg-description)) .modula-title{-webkit-line-clamp:2;line-clamp:2;}`;
		}
		css += `${root} .modula-item.modula-caption-below-image .modula-item-below-caption .modula-title,${root} .modula-item.modula-caption-below-image .modula-item-below-caption .jtg-description{position:static;transform:none;opacity:1;max-width:none;width:100%;}`;
		css += `${root} .modula-uniform-grid .modula-uniform-grid__cell:has(> .modula-item.modula-caption-below-image),${root} .modula-fit-grid .modula-uniform-grid__cell:has(> .modula-item.modula-caption-below-image){aspect-ratio:unset;height:auto;min-height:0;}`;
		css += `${root} .modula-uniform-grid .modula-uniform-grid__cell > .modula-item.modula-caption-below-image,${root} .modula-fit-grid .modula-uniform-grid__cell > .modula-item.modula-caption-below-image{height:auto !important;flex:0 0 auto;}`;
		css += `${root} .modula-uniform-grid .modula-item.modula-caption-below-image.modula-caption-below-image--fixed-tile,${root} .modula-fit-grid .modula-item.modula-caption-below-image.modula-caption-below-image--fixed-tile{height:auto !important;}`;
		css += `${root} .modula-uniform-grid .modula-item.modula-caption-below-image .modula-item-image-area.modula-uniform-grid__media,${root} .modula-fit-grid .modula-item.modula-caption-below-image .modula-item-image-area.modula-uniform-grid__media{aspect-ratio:var(--modula-uniform-aspect,1/1);flex:0 0 auto;width:100%;min-height:0;}`;
		css += `${root} .modula-uniform-grid:has(.modula-caption-below-image),${root} .modula-uniform-grid.modula-uniform-grid--caption-below,${root} .modula-fit-grid:has(.modula-caption-below-image),${root} .modula-fit-grid.modula-fit-grid--caption-below{align-items:start;grid-auto-rows:auto;}`;
		css += `${root} .modula-uniform-grid.modula-uniform-grid--caption-below .modula-uniform-grid__cell:not(.modula-uniform-grid__cell--page-break),${root} .modula-fit-grid.modula-fit-grid--caption-below .modula-uniform-grid__cell:not(.modula-uniform-grid__cell--page-break){aspect-ratio:unset !important;height:auto !important;min-height:0;overflow:visible;}`;
		css += `${root} .modula-uniform-grid.modula-uniform-grid--caption-below .modula-uniform-grid__cell > .modula-item.modula-item--embedded,${root} .modula-fit-grid.modula-fit-grid--caption-below .modula-uniform-grid__cell > .modula-item.modula-item--embedded{height:auto !important;aspect-ratio:var(--modula-uniform-aspect,1/1);min-height:clamp(5.5rem,16vw,11rem);}`;
	}

	const galleryType = safeString(config.type);
	const borderSize =
		galleryType === 'story'
			? 0
			: (safeNumber(groupedStyle.borderSize) ??
				safeNumber(config.borderSize) ??
				0);
	const borderRadius =
		galleryType === 'story'
			? 0
			: (safeNumber(groupedStyle.borderRadius) ??
				safeNumber(config.borderRadius) ??
				0);
	const shadowSize =
		galleryType === 'story'
			? 0
			: (safeNumber(groupedStyle.shadowSize) ??
				safeNumber(config.shadowSize) ??
				0);
	const borderColor =
		safeString(groupedStyle.borderColor) ||
		safeString(config.borderColor) ||
		'#000000';
	const shadowColor =
		safeString(groupedStyle.shadowColor) ||
		safeString(config.shadowColor) ||
		'#000000';
	/*
	 * Story/slider slides are carousel pages; global tile border/shadow/radius is for grid tiles.
	 * Without this guard, `#modula-N .modula-item` (ID specificity) overrides slide chrome.
	 * Story also zeros these in settingsToConfig so Uniform → Story cannot leak frame chrome.
	 * Slider Style frame is applied separately onto the image card / media shell below.
	 */
	const carouselSlideGuard =
		galleryType === 'story' || galleryType === 'slider'
			? ':not(.f-carousel__slide)'
			: '';
	const tileFrameSelectors = [
		`${root} .modula-item${carouselSlideGuard}`,
		`${root} .modula-justified-tile`,
		`${root} .modula-bnb-hero`,
		`${root} .modula-bnb-featured-cell`,
		`${root} .modula-bnb-grid-cell`,
		`${root} .modula-template__slot`,
	].join(',');
	const nestedTileFrameResetSelectors = [
		`${root} .modula-item-tiled > .modula-item`,
		`${root} .modula-justified-tile > .modula-item`,
		`${root} .modula-bnb-hero > .modula-item`,
		`${root} .modula-bnb-featured-cell > .modula-item`,
		`${root} .modula-bnb-grid-cell > .modula-item`,
	].join(',');

	const borderRadiusPx = Math.round(Math.max(0, borderRadius));
	const borderSizePx = Math.round(Math.max(0, borderSize));

	// Templates define their own rounding in `_template.scss`; override it from Style->borderRadius
	// (including the zero case) so preview matches what the editor controls.
	if (galleryType === 'template') {
		css += `${root} .modula-template__slot{border-radius:${borderRadiusPx}px;}`;
	}
	if (borderSizePx > 0) {
		css += `${tileFrameSelectors}{border:${borderSizePx}px solid ${borderColor};box-sizing:border-box;}`;
	}
	if (borderRadiusPx > 0) {
		css += `${tileFrameSelectors}{border-radius:${borderRadiusPx}px;}`;
	}
	if (shadowSize > 0 && galleryType !== 'polaroid') {
		css += `${tileFrameSelectors}{box-shadow:${shadowColor} 0 0 ${Math.round(
			shadowSize
		)}px;}`;
		/*
		 * BnB frame chrome lives on the cell; overflow:visible keeps box-shadow
		 * from being clipped. Image clipping is handled on nested items below.
		 */
		css += `${root} .modula-bnb-hero,${root} .modula-bnb-featured-cell,${root} .modula-bnb-grid-cell{overflow:visible;}`;
	}
	if (
		borderSizePx > 0 ||
		borderRadiusPx > 0 ||
		(shadowSize > 0 && galleryType !== 'polaroid')
	) {
		css += `${nestedTileFrameResetSelectors}{border:none;box-shadow:none;border-radius:0;}`;
	}
	/*
	 * BnB: cell stays overflow:visible for shadow, so clip media/overlays on
	 * nested content with the inner radius (outer radius minus border width).
	 */
	if (borderRadiusPx > 0) {
		const bnbInnerRadiusPx = Math.max(0, borderRadiusPx - borderSizePx);
		const bnbClipSelectors = [
			`${root} .modula-bnb-hero > .modula-item`,
			`${root} .modula-bnb-featured-cell > .modula-item`,
			`${root} .modula-bnb-grid-cell > .modula-item`,
			`${root} .modula-bnb-lightbox-only-overlay`,
			`${root} .modula-bnb-featured-cell--has-more::after`,
		].join(',');
		css += `${bnbClipSelectors}{border-radius:${bnbInnerRadiusPx}px;overflow:hidden;}`;
	}
	/* Polaroid: frame shadow/border live on `.modula-polaroid-frame`, not the slot shell. */
	if (galleryType === 'polaroid') {
		css += `${root} .modula-polaroid-slot{box-shadow:none !important;border:none !important;border-radius:0 !important;}`;
	}

	/*
	 * Slider card chrome: Style corner radius (and optional border/shadow) on the image.
	 * Outside captions: clip on `.modula-slider-slide-media` (slide stays overflow:visible).
	 * Inside / no caption: clip on the slide (and inside image wrapper).
	 */
	if (galleryType === 'slider') {
		const sliderRadiusPx = Math.round(Math.max(0, borderRadius));
		css += `${root}{--modula-slider-slide-radius:${sliderRadiusPx}px;}`;
		css += `${root} .modula-slider .modula-items.f-carousel .f-carousel__slide{border-radius:var(--modula-slider-slide-radius);}`;
		css += `${root} .modula-slider .modula-slider-slide-media{border-radius:var(--modula-slider-slide-radius);}`;
		css += `${root} .modula-slider .modula-slider-image-wrapper[class*='--caption-top_inside'],${root} .modula-slider .modula-slider-image-wrapper[class*='--caption-bot_inside']{border-radius:var(--modula-slider-slide-radius);overflow:hidden;}`;
		const sliderFrameTargets = `${root} .modula-slider .modula-items.f-carousel .f-carousel__slide:not(:has(.slider-image-info--top_outside)):not(:has(.slider-image-info--bot_outside)),${root} .modula-slider .modula-slider-slide-media`;
		if (borderSize > 0) {
			css += `${sliderFrameTargets}{border:${Math.round(
				borderSize
			)}px solid ${borderColor};box-sizing:border-box;}`;
		}
		if (shadowSize > 0) {
			css += `${sliderFrameTargets}{box-shadow:${shadowColor} 0 0 ${Math.round(
				shadowSize
			)}px;}`;
		}
	}

	const socialColor =
		safeString(groupedSocial.socialIconColor) ||
		safeString(config.socialIconColor) ||
		'#ffffff';
	const socialSize =
		safeNumber(groupedSocial.socialIconSize) ??
		safeNumber(config.socialIconSize);
	const socialPad =
		safeNumber(groupedSocial.socialIconPadding) ??
		safeNumber(config.socialIconPadding);
	css += `${root} .modula-item .modula-social a,${root} .modula-item .modula-social-expandable a,${root} .modula-item .modula-social-expandable-icons a,.lightbox-socials.modula-social a{fill:${socialColor};color:${socialColor};}`;
	css += `${root} .modula-item .modula-social svg,${root} .modula-item .modula-social svg path,${root} .modula-item .modula-social-expandable svg,${root} .modula-item .modula-social-expandable svg path,${root} .modula-item .modula-social-expandable-icons svg,${root} .modula-item .modula-social-expandable-icons svg path,.lightbox-socials.modula-social svg,.lightbox-socials.modula-social svg path{fill:${socialColor};}`;
	if (socialSize && socialSize > 0) {
		css += `${root} .modula-item .modula-social svg,${root} .modula-item .modula-social-expandable svg,${root} .modula-item .modula-social-expandable-icons svg,.lightbox-socials.modula-social svg{height:${socialSize}px;width:${socialSize}px;}`;
	}
	if (socialPad !== null && socialPad !== undefined && socialPad >= 0) {
		css += `${root} .modula-item .modula-social{gap:${socialPad}px;}`;
		css += `${root} .modula-item .modula-social-expandable-icons{gap:${socialPad}px;}`;
	}

	const widthValue = resolveGalleryWidthCss(
		clampMasonryGalleryWidth(
			config.width ?? groupedStyle.width,
			config.type
		)
	);
	if (widthValue) {
		const isPercent = widthValue.includes('%');
		if (isPercent) {
			css += `${root}{width:${widthValue};}`;
		} else {
			css += `${root}{width:${widthValue};max-width:100%;}`;
		}
	}

	const skipLoadingEffects = isGalleryTypeWithoutLoadingEffects(config.type);
	const scaleEnabled =
		!Object.prototype.hasOwnProperty.call(groupedLoading, 'enableScale') ||
		groupedLoading.enableScale === true ||
		groupedLoading.enableScale === 1 ||
		groupedLoading.enableScale === '1';
	const rotateEnabled =
		!Object.prototype.hasOwnProperty.call(groupedLoading, 'enableRotate') ||
		groupedLoading.enableRotate === true ||
		groupedLoading.enableRotate === 1 ||
		groupedLoading.enableRotate === '1';
	const slideEnabled =
		!Object.prototype.hasOwnProperty.call(groupedLoading, 'enableSlide') ||
		groupedLoading.enableSlide === true ||
		groupedLoading.enableSlide === 1 ||
		groupedLoading.enableSlide === '1';
	const loadedScale =
		skipLoadingEffects || !scaleEnabled
			? 100
			: (safeNumber(groupedLoading.loadedScale) ??
				safeNumber(config.loadedScale) ??
				100);
	const loadedRotate =
		skipLoadingEffects || !rotateEnabled
			? 0
			: (safeNumber(groupedLoading.loadedRotate) ??
				safeNumber(config.loadedRotate) ??
				0);
	const loadedHSlide =
		skipLoadingEffects || !slideEnabled
			? 0
			: (safeNumber(groupedLoading.loadedHSlide) ??
				safeNumber(config.loadedHSlide) ??
				0);
	const loadedVSlide =
		skipLoadingEffects || !slideEnabled
			? 0
			: (safeNumber(groupedLoading.loadedVSlide) ??
				safeNumber(config.loadedVSlide) ??
				0);
	const loadedFxTransform = `scale(${loadedScale / 100}) translate(${loadedHSlide}px, ${loadedVSlide}px) rotate(${loadedRotate}deg)`;
	const loadedFxNeutral = 'scale(1) translate(0px, 0px) rotate(0deg)';
	const hasLoadedFxOffset =
		!skipLoadingEffects &&
		(loadedScale !== 100 ||
			loadedRotate !== 0 ||
			loadedHSlide !== 0 ||
			loadedVSlide !== 0);
	/* Loading effects target image tiles only — embedded content blocks keep stable typography. */
	const imageItemSel = '.modula-item:not(.modula-item--embedded)';
	/*
	 * Modern React: photo lives in `.modula-item-picture-stack` (sibling of overlay
	 * chrome). Legacy PHP keeps the image inside `.modula-item-content`.
	 */
	const loadFxMediaLoadedSel = `${imageItemSel}.tg-loaded .modula-item-picture-stack, ${imageItemSel}.tg-loaded:not(:has(.modula-item-picture-stack)) .modula-item-content`;
	css += `${root} .modula-item--embedded .modula-item-content{transform:none !important;opacity:1 !important;}`;
	/*
	 * Load-in animation on tg-loaded tiles. inView ON: deferred until the gallery root
	 * gets `.modula-loaded-scale` (useGalleryInView). inView OFF: runs immediately via
	 * `.modula-loaded-effects` on the gallery root (useGalleryRootClasses).
	 */
	/*
	 * Load-in animation on tg-loaded tiles. inView ON: deferred until the gallery root
	 * gets `.modula-loaded-scale` (useGalleryInView). inView OFF: runs immediately via
	 * `.modula-loaded-effects` on the gallery root (useGalleryRootClasses).
	 */
	if (hasLoadedFxOffset) {
		const loadFxRootSel = config.inView
			? `${root}.modula-loaded-scale`
			: `${root}.modula-loaded-effects`;
		const loadFxRule = `${loadFxRootSel} ${loadFxMediaLoadedSel}{animation:modulaScaling 1s ease forwards;opacity:1;}`;
		const loadFxKeyframes = `@keyframes modulaScaling{0%{transform:${loadedFxNeutral}}50%{transform:${loadedFxTransform}}100%{transform:${loadedFxNeutral}}}`;
		/*
		 * Visitor frontend + respectReducedMotion On: only animate when OS allows motion.
		 * Editor preview always emits so authors can design load-in.
		 * Setting Off: always play even when prefers-reduced-motion is set.
		 */
		const honorOsReduce =
			!isSettingsEditorPreviewContext &&
			config.respectReducedMotion !== false;
		if (honorOsReduce) {
			css += `@media (prefers-reduced-motion: no-preference){${loadFxRule}${loadFxKeyframes}}`;
		} else {
			css += `${loadFxRule}${loadFxKeyframes}`;
		}
	}
	if (!skipLoadingEffects) {
		css += `${root}.modula-gallery-initialized.modula-loaded-scale ${imageItemSel}.tg-loaded .modula-item-content,${root}.modula-gallery-initialized.modula-loaded-effects ${imageItemSel}.tg-loaded .modula-item-content{opacity:1;}`;
	}

	css += buildFilterBarDynamicCss(root, groupedFilters, config);

	css += buildPaginationDynamicCss(root, groupedPagination);

	const lightboxType =
		safeString(groupedLightbox.lightbox) || safeString(config.lightbox);
	if (lightboxType === 'fancybox' || lightboxType === '') {
		const { alignSelf, textAlign } =
			resolveLightboxCaptionPositionAlignment(
				groupedLightbox.captionPosition
			);
		const lightboxRoot = `.modula-fancybox-container.modula-lightbox-${galleryId}`;
		css += `${lightboxRoot}{--modula-lightbox-caption-gutter:${MODULA_LIGHTBOX_CAPTION_GUTTER};--modula-lightbox-caption-align:${alignSelf};--modula-lightbox-caption-text-align:${textAlign};}`;
	}

	if (config.video) {
		const showVideoIcon =
			groupedVideo.showVideoIcon !== false &&
			config.video?.showVideoIcon !== false;
		const videoIconColor =
			safeString(groupedVideo.videoIconColor) ||
			safeString(config.video?.videoIconColor);
		const playIconSize = Array.isArray(groupedVideo.playIconSize)
			? groupedVideo.playIconSize
			: config.video?.playIconSize;

		if (showVideoIcon) {
			css += `${root} .modula-video-icon{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:2;}`;
			css += `${root} .modula-item .modula-video-icon{width:48px;height:auto;}`;
			css += `${root} .modula-video-main-item .modula-video-icon{width:48px;height:auto;}`;
			css += `${root} .modula-video-items .modula-video-icon{width:auto;height:auto;}`;
			css += `${root} .modula-video-icon--custom{object-fit:contain;max-width:100%!important;width:100%;height:auto;}`;
			if (videoIconColor && videoIconColor.toLowerCase() !== '#fff') {
				css += `${root} .modula-video-icon path{fill:${videoIconColor};}`;
			}
			if (Array.isArray(playIconSize) && playIconSize[0]) {
				const w0 = Math.round(playIconSize[0]);
				css += `${root} .modula-item .modula-video-icon,${root} .modula-video-main-item .modula-video-icon{width:${w0}px;}`;
			}
			if (Array.isArray(playIconSize) && playIconSize[1]) {
				css += `@media screen and (max-width:992px){${root} .modula-item .modula-video-icon,${root} .modula-video-main-item .modula-video-icon{width:${Math.round(playIconSize[1])}px;}}`;
			}
			if (Array.isArray(playIconSize) && playIconSize[2]) {
				css += `@media screen and (max-width:768px){${root} .modula-item .modula-video-icon,${root} .modula-video-main-item .modula-video-icon{width:${Math.round(playIconSize[2])}px;}}`;
			}
		}

		css += `${root} .modula-video-tile-preview{position:absolute;inset:0;z-index:1;pointer-events:auto;}`;
		css += `${root} .modula-video-tile-preview__media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0;}`;
		css += `${root} .modula-video-tile-preview.is-active ~ .modula-video-icon,${root} .modula-video-tile-preview.is-autoplay ~ .modula-video-icon{opacity:0;}`;

		if (config.type === 'video') {
			/*
			 * Style frame chrome for Video layout: main player + every playlist
			 * thumb (not only `.current-item`). Classic Pro only framed the active
			 * thumb; v2 applies Style to all video frames so border/radius/shadow
			 * match user expectation.
			 */
			const videoFrameSelectors = [
				`${root} .modula-video-main-item .modula-video-main-item-content`,
				`${root} .modula-video-items .modula-video-item .modula-item-content`,
			].join(',');
			if (borderSizePx > 0) {
				css += `${videoFrameSelectors}{border:${borderSizePx}px solid ${borderColor};box-sizing:border-box;}`;
			}
			if (borderRadiusPx > 0) {
				css += `${videoFrameSelectors}{border-radius:${borderRadiusPx}px;overflow:hidden;}`;
			}
			if (shadowSize > 0) {
				css += `${videoFrameSelectors}{box-shadow:${shadowColor} 0 0 ${Math.round(
					shadowSize
				)}px;}`;
			}
			/* Selection affordance when Style has no border/shadow (outline does not replace frame chrome). */
			if (borderSizePx <= 0 && shadowSize <= 0) {
				css += `${root} .modula-video-items .modula-video-item.current-item .modula-item-content{outline:2px solid #2271b1;outline-offset:0;}`;
			}
		}
	}

	const customCss =
		safeString(groupedStyle.customCss) || safeString(config.customCss);
	if (customCss) {
		css += customCss;
	}

	if (!css) {
		return null;
	}

	return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
