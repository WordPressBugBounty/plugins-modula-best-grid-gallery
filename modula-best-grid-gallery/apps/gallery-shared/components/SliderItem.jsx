/**
 * Slider slide tile: same media shell as GalleryItem (no lightbox link — slider is the viewer).
 *
 * @package
 */

import { useSelector } from 'react-redux';
import { getGalleryItemViewModel } from '../utils/galleryItemViewModel';
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

	if (isEmbeddedGalleryItemRow(itemData)) {
		return <EmbeddedGalleryItem itemData={itemData} config={config} />;
	}

	const vm = getGalleryItemViewModel(itemData, config, {
		stripHoverBuilderClasses: isSettingsEditorPreview,
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
			eagerImageMount
		/>
	);
}
