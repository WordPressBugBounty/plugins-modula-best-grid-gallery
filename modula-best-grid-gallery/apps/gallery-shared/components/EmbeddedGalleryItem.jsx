/**
 * V2-only tile: solid content block or rendered shortcode (no attachment).
 *
 * @package
 */

import { memo } from '@wordpress/element';
import GalleryPreviewAdminToolbarSlot from './GalleryPreviewAdminToolbarSlot';
import { useSelector } from 'react-redux';
import {
	DEFAULT_CONTENT_BLOCK_BACKGROUND,
	contrastingForegroundForBackground,
	solidContrastingForegroundForBackground,
} from '../utils/contentBlockContrast';
import {
	buildContentBlockBackgroundStyle,
	contentBlockNeedsEditorPaperSurface,
} from '../utils/contentBlockBackground';
import {
	blockFontFamilyCss,
	blockPaddingToCss,
} from '../utils/contentBlockLayout';
import { resolveContentBlockTileOverflow } from '../utils/contentBlockTileOverflow';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
} from '../utils/embeddedGalleryItemKinds';
import { resolveEmbeddedCarouselSlideLayout } from '../utils/embeddedCarouselSlideLayout';
import { useEmbeddedContentMount } from '../hooks/useEmbeddedContentMount';
import { isCaptionBelowImage } from '../utils/captionPlacement';
import { uniformGridCellAspectRatioFromConfig } from '../utils/uniformGridTileAspect';

/**
 * @param {Object} props
 * @param {Object} props.itemData - Bootstrap item (itemKind content_block|shortcode).
 * @param {Object} [props.config] - Flat gallery config.
 * @param {Object} [props.style]  - Layout slot style.
 */
function EmbeddedGalleryItem({ itemData, config, style = null }) {
	const isSettingsEditorPreview = useSelector(
		(s) =>
			s.gallery.metadata?.displayContext === 'settings-editor-preview' ||
			s.gallery.metadata?.staticStoryLayout === true
	);
	/**
	 * Story settings-editor stack (`.modula-story-editor-stack`) sizes tiles via CSS
	 * (`width: clamp(...)` + `aspect-ratio`). Image slides skip inline `width: 100%` because they
	 * carry `f-carousel__slide`; embedded tiles must not override that sizing.
	 */
	const useStoryEditorStackTileBox = useSelector(
		(s) =>
			s.gallery.config?.type === 'story' &&
			(s.gallery.metadata?.displayContext === 'settings-editor-preview' ||
				s.gallery.metadata?.staticStoryLayout === true)
	);

	let kind = itemData?.itemKind;
	if (!kind) {
		if (isContentBlockGalleryItemRow(itemData)) {
			kind = 'content_block';
		} else if (isEmbeddedGalleryItemRow(itemData)) {
			kind = 'shortcode';
		}
	}
	const bg =
		itemData?.blockBackgroundColor || DEFAULT_CONTENT_BLOCK_BACKGROUND;
	const fgExplicit = String(itemData?.blockTextColor || '').trim();
	const hasBackgroundImage =
		typeof itemData?.blockBackgroundImageUrl === 'string' &&
		itemData.blockBackgroundImageUrl.trim() !== '';
	const fg =
		fgExplicit ||
		(hasBackgroundImage
			? solidContrastingForegroundForBackground(bg)
			: contrastingForegroundForBackground(bg));
	const padCss = blockPaddingToCss(itemData?.blockPaddingPreset);
	const fontFamily = blockFontFamilyCss(itemData?.blockFontPreset);
	const isContentBlock = kind === 'content_block';
	const contentBlockBackgroundStyle = isContentBlock
		? buildContentBlockBackgroundStyle({
				color: bg,
				imageUrl: itemData?.blockBackgroundImageUrl,
				opacity: itemData?.blockBackgroundOverlayOpacity,
				size: itemData?.blockBackgroundSize,
				position: itemData?.blockBackgroundPosition,
				repeat: itemData?.blockBackgroundRepeat,
			})
		: null;
	const needsEditorPaperSurface =
		isSettingsEditorPreview &&
		isContentBlock &&
		contentBlockNeedsEditorPaperSurface({
			color: bg,
			textColor: fg,
			hasBackgroundImage,
		});
	const isCarouselSlide =
		(config?.type === 'slider' || config?.type === 'story') &&
		!useStoryEditorStackTileBox;
	const sliderAdaptiveHeight =
		config?.type === 'slider' && !!config?.sliderCarousel?.adaptiveHeight;
	const carouselSlideLayout = resolveEmbeddedCarouselSlideLayout(
		config,
		isCarouselSlide
	);
	const blockBodyHtml = isSettingsEditorPreview
		? itemData?.blockBodyHtml
		: (itemData?.blockBodyHtmlRendered ?? itemData?.blockBodyHtml ?? '');
	const shortcodeHtml = String(itemData?.shortcodeHtml || '');
	const shortcodeMountRef = useEmbeddedContentMount(
		kind === 'shortcode' ? shortcodeHtml : '',
		itemData,
		isSettingsEditorPreview
	);
	const blockBodyMountRef = useEmbeddedContentMount(
		isContentBlock ? String(blockBodyHtml || '') : '',
		itemData,
		isSettingsEditorPreview
	);
	const isTemplateGallery = config?.type === 'template';
	/* Masonry (`type: grid` + manual columns): no slot height from layout — `height: 100%` collapses. */
	const isReactMasonryPack =
		config?.type === 'grid' &&
		config?.grid_type &&
		config.grid_type !== 'automatic';
	const captionBelowImage = isCaptionBelowImage(config);
	const isEqualCellGrid =
		config?.type === 'uniform-grid' || config?.type === 'fit-grid';

	let rootFlexSizing = { width: '100%', height: '100%' };
	if (carouselSlideLayout) {
		rootFlexSizing = carouselSlideLayout.rootFlexSizing;
	} else if (useStoryEditorStackTileBox) {
		rootFlexSizing = {};
	} else if (isTemplateGallery) {
		/* Template content slots size to copy; absolute 100% height collapses in auto rows. */
		rootFlexSizing = { width: '100%', height: 'auto' };
	} else if (isReactMasonryPack) {
		rootFlexSizing = {
			width: '100%',
			height: 'auto',
			minHeight: 'clamp(5.5rem, 16vw, 11rem)',
		};
	} else if (captionBelowImage && isEqualCellGrid) {
		rootFlexSizing = {
			width: '100%',
			height: 'auto',
			aspectRatio: uniformGridCellAspectRatioFromConfig(config),
			minHeight: 'clamp(5.5rem, 16vw, 11rem)',
		};
	} else if (captionBelowImage) {
		rootFlexSizing = {
			width: '100%',
			height: 'auto',
			minHeight: 'clamp(5.5rem, 16vw, 11rem)',
		};
	} else if (isCarouselSlide && sliderAdaptiveHeight) {
		/* Fancyapps measures lastElementChild — floor matches masonry embedded tiles. */
		rootFlexSizing = {
			height: 'auto',
			minHeight: 'clamp(5.5rem, 16vw, 11rem)',
		};
	}

	/*
	 * Fancyapps sets slide width via --f-carousel-slide-width on .f-carousel__slide;
	 * inline width:100% overrides it and breaks peek / visible-at-once (GalleryItemMarkup parity).
	 */
	if (isCarouselSlide && rootFlexSizing.width) {
		const { width: _slideWidth, ...withoutWidth } = rootFlexSizing;
		rootFlexSizing = withoutWidth;
	}

	const contentUsesFlowLayout =
		carouselSlideLayout?.contentUsesFlowLayout ||
		sliderAdaptiveHeight ||
		isTemplateGallery;

	const inner =
		kind === 'shortcode' ? (
			<div
				ref={shortcodeMountRef}
				className="modula-embedded-shortcode"
				// Server-rendered shortcode HTML (same trust as PHP output).
				dangerouslySetInnerHTML={{
					__html: shortcodeHtml,
				}}
			/>
		) : (
			<div
				className="modula-embedded-block-inner"
				style={{
					color: fg,
					fontFamily,
				}}
			>
				{itemData?.title ? (
					<div
						className="modula-embedded-block__title"
						style={{ fontFamily }}
					>
						{itemData.title}
					</div>
				) : null}
				{itemData?.description ? (
					<div
						className="modula-embedded-block__description"
						style={{ fontFamily }}
					>
						{itemData.description}
					</div>
				) : null}
				{blockBodyHtml ? (
					<div
						ref={blockBodyMountRef}
						className="modula-embedded-block__body"
						// Server-rendered body (shortcodes expanded on public bootstrap).
						dangerouslySetInnerHTML={{
							__html: String(blockBodyHtml),
						}}
					/>
				) : null}
			</div>
		);

	return (
		<div
			className={[
				'modula-item',
				'modula-item--embedded',
				isCarouselSlide ? 'f-carousel__slide' : '',
				kind
					? `modula-item--embedded-${String(kind).replace(/_/g, '-')}`
					: '',
			]
				.filter(Boolean)
				.join(' ')}
			data-embedded-id={itemData?.embeddedId || itemData?.id}
			data-item-kind={kind}
			data-preview-surface={needsEditorPaperSurface ? 'paper' : undefined}
			data-width={itemData?.width ?? 2}
			data-height={itemData?.height ?? 2}
			style={{
				position: 'relative',
				...rootFlexSizing,
				boxSizing: 'border-box',
				...(isContentBlock && contentBlockBackgroundStyle
					? contentBlockBackgroundStyle
					: {}),
				/* Padding lives on .modula-item-content: a full-bleed absolute child would ignore outer padding. */
				overflow: isContentBlock ? 'hidden' : 'auto',
				...(style || {}),
			}}
		>
			{isSettingsEditorPreview ? (
				<div className="modula-item-preview-admin-mount">
					<div className="modula-item-preview-admin-mount__inner">
						<GalleryPreviewAdminToolbarSlot itemData={itemData} />
					</div>
				</div>
			) : null}
			<div
				className="modula-item-overlay"
				style={{ position: 'absolute', inset: 0, zIndex: 1 }}
				aria-hidden="true"
			/>
			<div
				className="modula-item-content modula-item-content--embedded"
				style={{
					position: contentUsesFlowLayout ? 'relative' : 'absolute',
					...(contentUsesFlowLayout ? {} : { inset: 0 }),
					zIndex: 2,
					/* AdaptiveHeight viewport uses this node's height (slide lastElementChild). */
					...(sliderAdaptiveHeight
						? { minHeight: 'clamp(5.5rem, 16vw, 11rem)' }
						: {}),
					...(carouselSlideLayout?.contentUsesFlowLayout
						? {
								flex: '1 1 auto',
								minHeight: 0,
								height: '100%',
								display: 'flex',
								flexDirection: 'column',
							}
						: {}),
					...(isContentBlock
						? {
								boxSizing: 'border-box',
								padding: padCss,
								...resolveContentBlockTileOverflow(),
							}
						: {}),
				}}
			>
				{inner}
			</div>
		</div>
	);
}

export default memo(EmbeddedGalleryItem);
