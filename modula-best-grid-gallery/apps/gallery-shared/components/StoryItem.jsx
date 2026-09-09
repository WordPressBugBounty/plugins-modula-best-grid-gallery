/**
 * Single story slide: full-bleed media via GalleryItemMarkup + optional bottom caption.
 * Video items (Modula Video Pro): inline HTML5 / YouTube / Vimeo via StoryVideoSlide.
 *
 * @package
 */

import { useSelector } from 'react-redux';
import { getGalleryItemViewModel } from '../utils/galleryItemViewModel';
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';
import { isStoryVideoItem } from '../utils/storyVideo';
import GalleryPreviewAdminToolbarSlot from './GalleryPreviewAdminToolbarSlot';
import GalleryItemMarkup from './GalleryItemMarkup';
import StoryVideoSlide from './StoryVideoSlide';
import StoryCaptionRichText from './StoryCaptionRichText';
import EmbeddedGalleryItem from './EmbeddedGalleryItem';

/**
 * @param {Object} props
 * @param {Object} props.itemData
 * @param {Object} props.config
 * @param {boolean} [props.isActive]
 * @param {boolean} [props.isEditorStack] - Settings-editor: stacked slides, no carousel / no autoplay.
 * @param {Function} [props.onVideoEnded]
 * @param {number} [props.videoIframeFallbackMs]
 */
export default function StoryItem({
	itemData,
	config,
	isActive = false,
	isEditorStack = false,
	onVideoEnded,
	videoIframeFallbackMs = 45000,
}) {
	const showStoryPreviewToolbar = useSelector(
		(s) =>
			s.gallery.metadata?.displayContext === 'settings-editor-preview' ||
			s.gallery.metadata?.staticStoryLayout === true
	);
	const previewAdminToolbar = showStoryPreviewToolbar ? (
		<GalleryPreviewAdminToolbarSlot itemData={itemData} />
	) : null;

	if (isEmbeddedGalleryItemRow(itemData)) {
		return <EmbeddedGalleryItem itemData={itemData} config={config} />;
	}

	const vm = getGalleryItemViewModel(itemData, config, {
		fillSlot: true,
	});

	if (!vm) {
		return null;
	}

	const item = vm.item;
	const showTitle = !item.hideTitle && String(item.title || '').trim() !== '';
	const showDesc =
		!item.hideDescription && String(item.description || '').trim() !== '';

	let captionNode = null;
	if (showTitle || showDesc) {
		captionNode = (
			<div className="modula-story-caption">
				{showTitle && (
					<div className="modula-story-caption__title">
						{item.title}
					</div>
				)}
				{showDesc && (
					<StoryCaptionRichText
						className="modula-story-caption__desc"
						html={item.description}
					/>
				)}
			</div>
		);
	}

	const slideActive = isEditorStack ? false : isActive;

	// isStoryVideoItem includes videoUrl, video_url, and videoSrc (adapter / Pro).
	if (isStoryVideoItem(itemData)) {
		return (
			<StoryVideoSlide
				vm={vm}
				itemData={itemData}
				isActive={slideActive}
				onPlaybackEnded={onVideoEnded}
				iframeFallbackMs={videoIframeFallbackMs}
				previewAdminToolbar={previewAdminToolbar}
			>
				{captionNode}
			</StoryVideoSlide>
		);
	}

	return (
		<GalleryItemMarkup
			vm={vm}
			imageWrapperClass="modula-story-image-wrapper"
			afterImage={captionNode}
			previewAdminToolbar={previewAdminToolbar}
			suppressOverlayText
		/>
	);
}
