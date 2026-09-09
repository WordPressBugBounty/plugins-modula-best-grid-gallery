/**
 * Presentational shell: picture, img, overlay — shared by GalleryItem and SliderItem.
 *
 * @package
 */

import {
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from '@wordpress/element';
import { mergeReactClassNameProps } from '../utils/attributeUtils';
import {
	bindGalleryItemImageLoaded,
	markGalleryItemImageLoaded,
} from '../utils/galleryItemImageLoaded';
import { isSafariBrowser } from '../utils/isSafari';
import { bindSafariGalleryItemImageReveal } from '../utils/safariGalleryItemImageReveal';
import { PictureStackRevealContext } from '../context/PictureStackRevealContext';
import LazyPictureGate from './LazyPictureGate';
import GalleryItemCaptionPopover from './GalleryItemCaptionPopover';
import {
	useCompactCaptionTile,
	useComposedCallbackRefs,
} from '../hooks/useCompactCaptionTile';
import {
	itemHasCaptionText,
	resolveGalleryItemCaptionChrome,
} from '../utils/compactCaptionTile';
import {
	isSliderCaptionInside,
	isSliderCaptionTop,
} from '../utils/sliderCaptionPosition';
import GalleryItemSocialLinks from './social/GalleryItemSocialLinks';
import GalleryItemExpandableSocials from './social/GalleryItemExpandableSocials';

function parseInlineStyle(styleValue) {
	if (!styleValue || typeof styleValue !== 'string') {
		return {};
	}
	const out = {};
	styleValue
		.split(';')
		.map((part) => part.trim())
		.filter(Boolean)
		.forEach((declaration) => {
			const idx = declaration.indexOf(':');
			if (idx <= 0) {
				return;
			}
			const prop = declaration.slice(0, idx).trim();
			const value = declaration.slice(idx + 1).trim();
			if (!prop || !value) {
				return;
			}
			out[prop] = value;
		});
	return out;
}

/**
 * @param {Object} item
 * @param {string} [imgAlt]
 * @returns {string}
 */
function resolveLightboxLinkLabel(item, imgAlt) {
	const title = String(item?.title || '').trim();
	if (title) {
		return title;
	}
	const alt = String(imgAlt || item?.alt || '').trim();
	if (alt) {
		return alt;
	}
	return 'Open image in lightbox';
}

/**
 * @param {Object} props
 * @param {Object} props.imgAttrs - Props for `<img>` from buildImgAttrs.
 */
function ModulaGalleryItemImage({ imgAttrs }) {
	const imgRef = useRef(null);
	const [revealed, setRevealed] = useState(false);
	const notifyPictureRevealed = useContext(PictureStackRevealContext);
	const {
		onLoad: inheritedOnLoad,
		className,
		...imgAttrsSansLoad
	} = imgAttrs;

	const revealImage = useCallback(
		(imgEl) => {
			setRevealed(true);
			notifyPictureRevealed?.();
			markGalleryItemImageLoaded(imgEl);
		},
		[notifyPictureRevealed]
	);

	const handleLoad = useCallback(
		(event) => {
			inheritedOnLoad?.(event);
			revealImage(event.currentTarget);
		},
		[inheritedOnLoad, revealImage]
	);

	useEffect(() => {
		const img = imgRef.current;
		if (!img) {
			return () => {};
		}
		if (img.complete && img.naturalWidth > 0) {
			revealImage(img);
			return () => {};
		}
		if (isSafariBrowser()) {
			return bindSafariGalleryItemImageReveal(img, () =>
				revealImage(img)
			);
		}
		return bindGalleryItemImageLoaded(img);
	}, [imgAttrs.src, revealImage]);

	const imgClassName = [
		className,
		revealed
			? 'modula-item-picture__img--revealed'
			: 'modula-item-picture__img--pending',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<img
			{...imgAttrsSansLoad}
			ref={imgRef}
			className={imgClassName}
			onLoad={handleLoad}
			alt={imgAttrsSansLoad.alt || ''}
		/>
	);
}

/**
 * @param {Object}                    props
 * @param {Object}                    props.item
 * @param {boolean}                   props.hasTitle
 * @param {boolean}                   props.hasDescription
 * @param {boolean}                   props.hasSocials
 */
export function GalleryItemTextContent({
	item,
	hasTitle,
	hasDescription,
	hasSocials,
}) {
	return (
		<>
			{hasTitle ? <div className="modula-title">{item.title}</div> : null}
			{hasDescription ? (
				<div
					className="jtg-description"
					dangerouslySetInnerHTML={{
						__html: String(item.description),
					}}
				/>
			) : null}
			{hasSocials ? (
				<div className="modula-social">
					<GalleryItemSocialLinks
						itemId={item.id}
						socials={item.socials}
					/>
				</div>
			) : null}
		</>
	);
}

/**
 * @param {Object}                    props
 * @param {Object}                    props.vm                    - Non-null view model from getGalleryItemViewModel.
 * @param {string}                    [props.imageWrapperClass]   - e.g. modula-slider-image-wrapper (slider layout).
 * @param {import('react').ReactNode} [props.beforeImage]         - Markup before &lt;picture&gt; (slider captions top).
 * @param {import('react').ReactNode} [props.afterImage]          - Markup after &lt;picture&gt; (slider captions bottom).
 * @param {string|null}               [props.sliderCaptionPosition] - Slider caption placement slug.
 * @param {import('react').ReactNode} [props.sliderCaptionNode] - &lt;figcaption&gt; for slider image info.
 * @param {string}                    [props.sliderCaptionDescribedById] - `aria-describedby` target on slide image.
 * @param {import('react').ReactNode} [props.previewAdminToolbar] - Settings-editor hover actions above overlays.
 * @param {boolean}                   [props.suppressOverlayText] - Hide overlay title/caption (story/slider own caption chrome).
 * @param {import('react').ReactNode} [props.videoPlayOverlay] - Play icon for mixed-gallery video tiles.
 * @param {import('react').ReactNode} [props.videoPreviewNode] - Hover / autoplay video preview layer.
 */
export default function GalleryItemMarkup({
	vm,
	imageWrapperClass = '',
	beforeImage = null,
	afterImage = null,
	sliderCaptionPosition = null,
	sliderCaptionNode = null,
	sliderCaptionDescribedById = undefined,
	previewAdminToolbar = null,
	slotMeasureRef = undefined,
	suppressOverlayText = false,
	eagerImageMount = false,
	videoPlayOverlay = null,
	videoPreviewNode = null,
}) {
	const {
		item,
		style,
		itemAttrs,
		itemClasses,
		linkAttrs,
		linkHref,
		showLink,
		linkClasses,
		imageSrc,
		placeholderSrc,
		effectiveSizes,
		pictureAbsoluteFill,
		hasFocalCrop,
		fallbackSource,
		imgAttrs,
		captionBelowImage = false,
		compactCaptionPopover = true,
		compactCaptionMinSize = 240,
		belowImageAlignment = 'left',
		belowImageSpacing = 8,
		belowImagePadding = 0,
		polaroidCaptionInChin = false,
		stripHoverBuilderClasses = false,
	} = vm;
	const showTitle = !item.hideTitle && String(item.title || '').trim() !== '';
	const showDescription =
		!item.hideDescription && String(item.description || '').trim() !== '';
	const hasCaptionCopy = itemHasCaptionText(item.title, item.description, {
		hideTitle: item.hideTitle,
		hideDescription: item.hideDescription,
	});
	// Slider / story own caption chrome — skip compact popover there.
	// Settings-editor preview keeps the admin toolbar but still uses the same
	// compact-tile hover/long-press popover as the frontend (below-image parity).
	const compactCaptionEnabled =
		compactCaptionPopover &&
		hasCaptionCopy &&
		!suppressOverlayText &&
		!(sliderCaptionPosition && sliderCaptionNode);
	const { measureRef: compactMeasureRef, isCompact: useCaptionPopover } =
		useCompactCaptionTile(compactCaptionEnabled, {
			width: Number(vm.slotWidth) || 0,
			height: Number(vm.slotHeight) || 0,
			minSize: compactCaptionMinSize,
		});

	const {
		hasOverlayTitle,
		hasOverlayDescription,
		hasBelowTitle,
		hasBelowDescription,
	} = resolveGalleryItemCaptionChrome({
		showTitle,
		showDescription,
		suppressOverlayText,
		useCaptionPopover,
		stripHoverBuilderClasses,
		previewAdminToolbar: Boolean(previewAdminToolbar),
	});
	const hasBelowText = hasBelowTitle || hasBelowDescription;
	const hasSocialNetworks =
		!previewAdminToolbar &&
		!item.hideSocials &&
		Array.isArray(item.socials) &&
		item.socials.length > 0;
	const socialDesktopCollapsed = !!item.socialDesktopCollapsed;
	/** Inline .modula-social in figc — hidden when folded bar / mobile CSS applies. */
	const hasInlineSocials = hasSocialNetworks && !socialDesktopCollapsed;
	const expandableSocials = hasSocialNetworks ? (
		<GalleryItemExpandableSocials
			itemId={item.id}
			socials={item.socials}
			desktopCollapsed={socialDesktopCollapsed}
		/>
	) : null;
	const lightboxLinkLabel = resolveLightboxLinkLabel(item, imgAttrs?.alt);
	const rootInlineStyle = parseInlineStyle(itemAttrs?.style);
	const itemFillsParentSlot = style?.height === '100%';
	if (captionBelowImage && !itemFillsParentSlot) {
		delete rootInlineStyle.height;
		delete rootInlineStyle.minHeight;
	}
	const tileStyle =
		captionBelowImage && style && !itemFillsParentSlot
			? { ...style, height: undefined, minHeight: undefined }
			: style;
	const { style: _ignoredInlineStyle, ...itemAttrsSansStyle } = itemAttrs;

	const imageAreaRef = useComposedCallbackRefs(
		slotMeasureRef,
		compactCaptionEnabled ? compactMeasureRef : null
	);

	const captionPopover =
		useCaptionPopover && compactCaptionEnabled ? (
			<GalleryItemCaptionPopover
				title={item.title}
				descriptionHtml={item.description}
				showTitle={showTitle}
				showDescription={showDescription}
			/>
		) : null;

	const pictureClassName = [
		'modula-item-picture',
		hasFocalCrop ? 'modula-item-picture--focal-crop' : '',
	]
		.filter(Boolean)
		.join(' ');

	const resolvedImgAttrs =
		sliderCaptionDescribedById && imgAttrs
			? {
					...imgAttrs,
					'aria-describedby': [
						imgAttrs['aria-describedby'],
						sliderCaptionDescribedById,
					]
						.filter(Boolean)
						.join(' '),
				}
			: imgAttrs;

	// Adaptive-height carousels (slider) derive slide height from the image, so the
	// JS mount gate would deadlock: no image -> zero-height slide -> carousel viewport
	// clipped to 0 -> IntersectionObserver never fires -> image never mounts. Keep the
	// native loading="lazy" on the <img> (from buildImgAttrs) but always mount markup.
	const pictureNode = imageSrc ? (
		<LazyPictureGate
			lazyLoad={eagerImageMount ? false : item.lazyLoad}
			fillParent={pictureAbsoluteFill}
			placeholderSrc={placeholderSrc}
			placeholderClassName={imgAttrs?.className}
			placeholderStyle={imgAttrs?.style}
		>
			<picture
				id={`multi_picture_${item.id}`}
				className={pictureClassName}
				data-id={item.id}
				style={
					pictureAbsoluteFill
						? {
								position: 'absolute',
								inset: 0,
								width: '100%',
								height: '100%',
								overflow: 'hidden',
							}
						: undefined
				}
			>
				{fallbackSource.map((source, idx) => (
					<source
						key={idx}
						type={source.type}
						srcSet={source.srcset}
						sizes={effectiveSizes}
					/>
				))}
				<ModulaGalleryItemImage imgAttrs={resolvedImgAttrs} />
			</picture>
		</LazyPictureGate>
	) : null;

	/** Fancyapps sets slide width via --f-carousel-slide-width on .f-carousel__slide; inline 100% would override it. */
	const isCarouselSlide = itemClasses.includes('f-carousel__slide');

	const captionPos =
		sliderCaptionPosition && sliderCaptionNode
			? sliderCaptionPosition
			: null;
	const captionInside = captionPos
		? isSliderCaptionInside(captionPos)
		: false;
	const captionTop = captionPos ? isSliderCaptionTop(captionPos) : false;

	const sliderWrapperClassName = [
		imageWrapperClass,
		captionPos ? `${imageWrapperClass}--caption-${captionPos}` : '',
	]
		.filter(Boolean)
		.join(' ');

	const insideCaptionBlock =
		captionInside && sliderCaptionNode ? (
			<>
				<div className="slider-image-info__scrim" aria-hidden="true" />
				{sliderCaptionNode}
			</>
		) : null;

	const flowBeforeImage =
		captionPos && !captionInside && captionTop
			? sliderCaptionNode
			: beforeImage;
	const flowAfterImage =
		captionPos && !captionInside && !captionTop
			? sliderCaptionNode
			: afterImage;

	const previewAdminMount = previewAdminToolbar ? (
		<div className="modula-item-preview-admin-mount">
			<div className="modula-item-preview-admin-mount__inner">
				{previewAdminToolbar}
			</div>
		</div>
	) : null;

	/*
	 * Outside slide captions live in flow under/above the image. Absolute tile chrome
	 * (link / overlay / figc / admin shade) must stay on the media shell only — otherwise
	 * inset:0 covers the caption and fixed-height aspect-ratio clips it.
	 */
	const sliderOutsideCaption = Boolean(captionPos && !captionInside);
	const hoistSliderChromeIntoMedia = isCarouselSlide && sliderOutsideCaption;

	const sliderOverlayBlock = (
		<div
			className="modula-item-overlay"
			style={{ position: 'absolute', inset: 0 }}
			aria-hidden="true"
		/>
	);
	const sliderContentBlock = (
		<div
			className="modula-item-content"
			style={{ position: 'absolute', inset: 0 }}
		>
			<div
				className={`figc${hasOverlayTitle ? '' : ' no-title'}${
					hasOverlayDescription ? '' : ' no-description'
				}`}
			>
				<div className="figc-inner">
					<GalleryItemTextContent
						item={item}
						hasTitle={hasOverlayTitle}
						hasDescription={hasOverlayDescription}
						hasSocials={hasInlineSocials}
					/>
				</div>
			</div>
		</div>
	);
	const sliderLinkBlock =
		showLink && hoistSliderChromeIntoMedia ? (
			<a
				{...mergeReactClassNameProps(linkAttrs, linkClasses)}
				href={linkHref || '#'}
				aria-label={lightboxLinkLabel}
			/>
		) : null;

	const sliderMediaChildren = (
		<>
			{hoistSliderChromeIntoMedia ? (
				<>
					{sliderLinkBlock}
					{previewAdminMount}
					{sliderOverlayBlock}
					{sliderContentBlock}
				</>
			) : null}
			{pictureNode}
			{videoPreviewNode}
			{videoPlayOverlay}
			{insideCaptionBlock}
		</>
	);

	const imageBlock =
		imageWrapperClass && pictureNode && !captionBelowImage ? (
			<div ref={slotMeasureRef} className={sliderWrapperClassName}>
				{flowBeforeImage}
				{sliderOutsideCaption ? (
					<div className="modula-slider-slide-media">
						{sliderMediaChildren}
					</div>
				) : (
					sliderMediaChildren
				)}
				{flowAfterImage}
			</div>
		) : (
			<>
				{beforeImage}
				{pictureNode}
				{videoPreviewNode}
				{videoPlayOverlay}
				{afterImage}
			</>
		);

	const belowImageAreaClassName = [
		'modula-item-image-area',
		captionBelowImage && imageWrapperClass ? imageWrapperClass : '',
	]
		.filter(Boolean)
		.join(' ');
	const belowImageLockedSlotHeight =
		captionBelowImage && !itemFillsParentSlot && Number(vm.slotHeight) > 0
			? Number(vm.slotHeight)
			: 0;
	const belowImageAreaStyle = captionBelowImage
		? itemFillsParentSlot
			? {
					position: 'relative',
					width: '100%',
					flex: '1 1 0',
					minHeight: 0,
					overflow: 'hidden',
				}
			: {
					position: 'relative',
					width: '100%',
					overflow: 'hidden',
					...(belowImageLockedSlotHeight > 0
						? {
								height: `${belowImageLockedSlotHeight}px`,
								flex: '0 0 auto',
							}
						: {}),
				}
		: undefined;

	if (captionBelowImage) {
		const belowRootClass = [
			itemAttrsSansStyle.className,
			useCaptionPopover ? 'modula-item--compact-caption' : '',
		]
			.filter(Boolean)
			.join(' ');
		return (
			<div
				{...itemAttrsSansStyle}
				className={belowRootClass}
				data-modula-image-id={item.id}
				style={{
					...rootInlineStyle,
					position: 'relative',
					...(isCarouselSlide ? {} : { width: '100%' }),
					...tileStyle,
				}}
			>
				<div
					className={belowImageAreaClassName}
					style={belowImageAreaStyle}
					ref={imageAreaRef}
				>
					{showLink && (
						<a
							{...mergeReactClassNameProps(
								linkAttrs,
								linkClasses
							)}
							href={linkHref || '#'}
							aria-label={lightboxLinkLabel}
						/>
					)}
					<div className="modula-item-hover-media">
						{imageBlock}
						{previewAdminMount}
						<div
							className="modula-item-overlay"
							style={{ position: 'absolute', inset: 0 }}
							aria-hidden="true"
						/>
						{hasInlineSocials ? (
							<div
								className="modula-item-content"
								style={{ position: 'absolute', inset: 0 }}
							>
								<div
									className={`figc no-title no-description${
										hasInlineSocials ? '' : ' no-social'
									}`}
								>
									<div className="figc-inner">
										<GalleryItemTextContent
											item={item}
											hasTitle={false}
											hasDescription={false}
											hasSocials={hasInlineSocials}
										/>
									</div>
								</div>
							</div>
						) : null}
					</div>
					{expandableSocials}
				</div>
				{captionPopover}
				{hasBelowText ? (
					<div
						className={`modula-item-below-caption modula-item-below-caption--align-${belowImageAlignment}${
							polaroidCaptionInChin
								? ' modula-item-below-caption--polaroid-chin'
								: ''
						}`}
						style={
							polaroidCaptionInChin
								? undefined
								: {
										marginTop: `${belowImageSpacing}px`,
										...(belowImagePadding > 0
											? {
													padding: `${belowImagePadding}px`,
												}
											: {}),
									}
						}
					>
						<GalleryItemTextContent
							item={item}
							hasTitle={hasBelowTitle}
							hasDescription={hasBelowDescription}
							hasSocials={false}
						/>
					</div>
				) : null}
			</div>
		);
	}

	const overlayRootClass = [
		itemAttrsSansStyle.className,
		useCaptionPopover ? 'modula-item--compact-caption' : '',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div
			ref={imageWrapperClass ? undefined : imageAreaRef}
			{...itemAttrsSansStyle}
			className={overlayRootClass}
			data-modula-image-id={item.id}
			style={{
				...rootInlineStyle,
				position: 'relative',
				...(isCarouselSlide ? {} : { width: '100%' }),
				...style,
			}}
		>
			{!hoistSliderChromeIntoMedia && showLink ? (
				<a
					{...mergeReactClassNameProps(linkAttrs, linkClasses)}
					href={linkHref || '#'}
					aria-label={lightboxLinkLabel}
				/>
			) : null}
			{isCarouselSlide ? null : (
				<div className="modula-item-hover-media">
					{imageBlock}
					{!hoistSliderChromeIntoMedia && previewAdminMount
						? previewAdminMount
						: null}
					{!hoistSliderChromeIntoMedia ? (
						<>
							{sliderOverlayBlock}
							{sliderContentBlock}
						</>
					) : null}
				</div>
			)}
			{captionPopover}
			{/*
			 * Expandable FAB is absolute; keep before carousel imageBlock so Fancyapps
			 * adaptiveHeight still measures the image wrapper as lastElementChild.
			 */}
			{expandableSocials}
			{isCarouselSlide ? imageBlock : null}
		</div>
	);
}
