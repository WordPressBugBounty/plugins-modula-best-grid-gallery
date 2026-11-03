/**
 * Slider slide tile: same media shell as GalleryItem. A gallery slider has no
 * tile link (its click mode is always "No link": the slider is the viewer); a
 * Pro Slider album asks for "Go to URL", so its member slides link.
 *
 * @package
 */

import { useContext } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { GalleryItemChromeContext } from '../context/GalleryItemChromeContext';
import { getGalleryItemViewModel } from '../utils/galleryItemViewModel';
import { resolveGalleryItemLoadedFileDimensions } from '../utils/galleryItemIntrinsicDimensions';
import {
	getSliderSlideFileSize,
	readSliderSlideFullSize,
} from '../utils/sliderSlideFileSize';
import { getTileLinkRenderOptions } from '../utils/resolveGalleryItemLink';
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';
import {
	normalizeSliderCaptionPosition,
	sliderCaptionElementId,
} from '../utils/sliderCaptionPosition';
import GalleryPreviewAdminToolbarSlot from './GalleryPreviewAdminToolbarSlot';
import GalleryItemMarkup from './GalleryItemMarkup';
import EmbeddedGalleryItem from './EmbeddedGalleryItem';
import SliderSlideCaption from './SliderSlideCaption';

/**
 * The slide drawn from its attachment's Full file instead of the loaded one.
 *
 * @param {Object}                            itemData
 * @param {{ width: number, height: number }} fullSize
 * @return {Object} Item data for the Full file.
 */
function withFullFile(itemData, fullSize) {
	const imgAttributes =
		itemData.imgAttributes || itemData.img_attributes || {};
	return {
		...itemData,
		src: itemData.url,
		thumbnail: itemData.url,
		srcset: '',
		pictureSources: undefined,
		imgAttributes: {
			...imgAttributes,
			width: fullSize.width,
			height: fullSize.height,
			'data-src': itemData.url,
			'data-lazy': itemData.url,
			srcset: undefined,
		},
		img_attributes: undefined,
	};
}

/**
 * Image file size of one slide: with Height follows slide, a scale-down slide
 * shows at its file's width (CSS variables read by index.scss), not at
 * whatever `sizes` resolves to. Derived from the setting being edited, so the
 * canvas follows it live; there the Full size (`fullImageSize`, editor-only)
 * stands in for the loaded file, and a slide whose loaded file is narrower
 * than the chosen one draws the Full file rather than upscale it.
 *
 * @param {Object} itemData
 * @param {Object} config
 * @return {{ itemData: Object, style: Object|null }} Item data to draw and the slide style.
 */
function resolveSliderSlideFile(itemData, config) {
	const loaded = resolveGalleryItemLoadedFileDimensions(itemData, config);
	const fullSize = readSliderSlideFullSize(itemData?.fullImageSize);
	const file = getSliderSlideFileSize(
		config.sliderSlideFileBox,
		fullSize || loaded
	);
	if (!file) {
		return { itemData, style: null };
	}
	const style = {
		'--modula-slider-file-width': `${file.width}px`,
		'--modula-slider-file-aspect': `${file.width} / ${file.height}`,
	};
	const loadedFileTooNarrow =
		Boolean(fullSize) &&
		typeof itemData.url === 'string' &&
		itemData.url !== '' &&
		file.width > (loaded.width ?? 0);
	return {
		itemData: loadedFileTooNarrow
			? withFullFile(itemData, fullSize)
			: itemData,
		style,
	};
}

/**
 * @param {Object} props
 * @param {Object} props.itemData
 * @param {Object} props.config
 */
export default function SliderItem({ itemData, config }) {
	const isSettingsEditorPreview = useSelector(
		(s) =>
			s.gallery.metadata?.displayContext === 'settings-editor-preview' ||
			s.gallery.metadata?.staticStoryLayout === true
	);
	const renderItemChrome = useContext(GalleryItemChromeContext);

	if (isEmbeddedGalleryItemRow(itemData)) {
		return <EmbeddedGalleryItem itemData={itemData} config={config} />;
	}

	const linkRender = getTileLinkRenderOptions(isSettingsEditorPreview);
	const slideFile = resolveSliderSlideFile(itemData, config);
	const vm = getGalleryItemViewModel(slideFile.itemData, config, {
		style: slideFile.style,
		stripHoverBuilderClasses: isSettingsEditorPreview,
		renderLinks: linkRender.renderLinks,
		forceLinkNewTab: linkRender.forceLinkNewTab,
	});

	if (!vm) {
		return null;
	}

	const showInfo = !!config.sliderImageInfo;
	const position = normalizeSliderCaptionPosition(
		config.sliderImageInfoPosition
	);
	const item = vm.item;
	const imgAttrSource =
		itemData?.imgAttributes || itemData?.img_attributes || {};
	const slideTitle =
		String(item.title || imgAttrSource.title || '').trim() ||
		String(item.alt || imgAttrSource.alt || '').trim();

	const captionNode = showInfo ? (
		<SliderSlideCaption
			position={position}
			title={slideTitle}
			description={item.description}
			hideTitle={item.hideTitle}
			hideDescription={item.hideDescription}
			imageId={item.id}
		/>
	) : null;

	const captionDescribedById = captionNode
		? sliderCaptionElementId(item.id)
		: '';

	const previewAdminToolbar = isSettingsEditorPreview ? (
		<GalleryPreviewAdminToolbarSlot itemData={itemData} />
	) : null;

	return (
		<GalleryItemMarkup
			vm={vm}
			imageWrapperClass="modula-slider-image-wrapper"
			sliderCaptionPosition={captionNode ? position : null}
			sliderCaptionNode={captionNode}
			sliderCaptionDescribedById={captionDescribedById || undefined}
			/*
			 * Slider opts out of hover-v2 classes (GALLERY_TYPES_WITHOUT_HOVER_EFFECTS),
			 * so overlay .figc title/caption would stay opacity:1 forever. Only
			 * SliderSlideCaption (slider.imageInfo) may show copy on slides.
			 */
			suppressOverlayText
			previewAdminToolbar={previewAdminToolbar}
			/* Every slide is selected, opened and trashed on the canvas, whatever its caption (Lite ticket 92). */
			slideChrome
			itemChrome={
				renderItemChrome ? renderItemChrome(slideFile.itemData) : null
			}
			eagerImageMount
		/>
	);
}
