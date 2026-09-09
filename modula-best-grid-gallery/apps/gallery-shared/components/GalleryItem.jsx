/**
 * Single gallery item: image, overlay, optional caption/link.
 * Layouts use this for grids; slider uses SliderItem (Fancybox empty-anchor behavior).
 *
 * @package
 */

import { memo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { getGalleryItemViewModel } from '../utils/galleryItemViewModel';
import { useSlotDimensions } from '../hooks/useSlotDimensions';
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';
import { isGalleryItemHiddenFromLightbox } from '../utils/prepareItemData';
import GalleryPreviewAdminToolbarSlot from './GalleryPreviewAdminToolbarSlot';
import GalleryItemMarkup from './GalleryItemMarkup';
import GalleryItemVideoPreview from './GalleryItemVideoPreview';
import EmbeddedGalleryItem from './EmbeddedGalleryItem';
import {
	isSettingsEditorPreview,
	isStaticStoryPreview,
} from '../utils/displayContext';
import { getTileLinkRenderOptions } from '../utils/resolveGalleryItemLink';
import { isVideoGalleryItem } from '../video/videoGalleryModel';
import VideoGalleryPlayIcon, {
	resolveVideoPlayIconAttachmentId,
	resolveVideoPlayIconCustomSrc,
} from '../video/VideoGalleryPlayIcon';

/**
 * @param {unknown[]} items
 * @param {Object}    itemData
 * @param {Object}    [config]
 * @return {number}
 */
function resolveDeeplinkIndex(items, itemData, config) {
	if (!Array.isArray(items) || !itemData) {
		return -1;
	}
	const lightboxItems = items.filter((row) => {
		if (!row || isEmbeddedGalleryItemRow(row)) {
			return false;
		}
		if (isGalleryItemHiddenFromLightbox(row)) {
			return false;
		}
		const mode =
			typeof row.lightbox === 'string' && row.lightbox.trim() !== ''
				? row.lightbox
				: config?.lightbox || 'fancybox';
		return mode === 'fancybox';
	});
	const rowId = itemData.id;
	return lightboxItems.findIndex((row) => {
		if (rowId !== undefined && rowId !== null && row.id === rowId) {
			return true;
		}
		return false;
	});
}

function GalleryItem({
	itemData,
	config,
	style = null,
	className: extraClassName = '',
	slotWidth,
	slotHeight,
	/** When true, image fills the slot (object-fit: cover). Used for custom grid. */
	fillSlot = false,
	imageWrapperClass = '',
}) {
	const isPreviewContext = useSelector(
		(s) =>
			isSettingsEditorPreview(s.gallery.metadata) ||
			isStaticStoryPreview(s.gallery.metadata)
	);
	const metadata = useSelector((s) => s.gallery.metadata || {});
	/*
	 * Primitive deeplink index — avoid selecting the full items array so
	 * unrelated content-block patches do not re-render every image tile.
	 */
	const deeplinkIndex = useSelector((s) => {
		if (!itemData || isEmbeddedGalleryItemRow(itemData)) {
			return -1;
		}
		const displayItems = s.items?.filteredItems ?? s.items?.items ?? [];
		return resolveDeeplinkIndex(displayItems, itemData, config);
	});

	if (isEmbeddedGalleryItemRow(itemData)) {
		return (
			<EmbeddedGalleryItem
				itemData={itemData}
				config={config}
				style={style}
			/>
		);
	}

	const needsSlotMeasure =
		fillSlot && (!Number(slotWidth) || !Number(slotHeight));
	const {
		slotRef,
		slotWidth: measuredW,
		slotHeight: measuredH,
	} = useSlotDimensions(needsSlotMeasure);

	const resolvedSlotWidth =
		Number(slotWidth) > 0 ? slotWidth : measuredW || undefined;
	const resolvedSlotHeight =
		Number(slotHeight) > 0 ? slotHeight : measuredH || undefined;

	/*
	 * Settings-editor preview never renders navigable tile links (including
	 * Direct / External URL / attachment-page) so click opens Image edit.
	 * Visitor galleries still get those overlays via renderLinks: true.
	 */
	const linkRender = getTileLinkRenderOptions(isPreviewContext);

	const vm = getGalleryItemViewModel(itemData, config, {
		style,
		extraClassName,
		slotWidth: resolvedSlotWidth,
		slotHeight: resolvedSlotHeight,
		fillSlot,
		renderLinks: linkRender.renderLinks,
		forceLinkNewTab: linkRender.forceLinkNewTab,
		stripHoverBuilderClasses: isPreviewContext,
		deeplinkIndex: deeplinkIndex >= 0 ? deeplinkIndex : undefined,
	});

	if (!vm) {
		return null;
	}

	const previewAdminToolbar = isPreviewContext ? (
		<GalleryPreviewAdminToolbarSlot itemData={itemData} />
	) : null;

	const videoSettings = config?.video || {};
	const isMixedVideoTile =
		config?.type !== 'video' &&
		config?.type !== 'story' &&
		config?.type !== 'slider' &&
		isVideoGalleryItem(itemData);
	const showVideoIcon =
		isMixedVideoTile && videoSettings.showVideoIcon !== false;
	const iconSize = Array.isArray(videoSettings.playIconSize)
		? videoSettings.playIconSize[0] || 48
		: 48;
	const videoPlayOverlay = showVideoIcon ? (
		<VideoGalleryPlayIcon
			color={
				typeof videoSettings.videoIconColor === 'string'
					? videoSettings.videoIconColor
					: '#FFF'
			}
			size={iconSize}
			customSrc={resolveVideoPlayIconCustomSrc(videoSettings)}
			attachmentId={resolveVideoPlayIconAttachmentId(videoSettings)}
		/>
	) : null;
	const videoPreviewNode = isMixedVideoTile ? (
		<GalleryItemVideoPreview
			itemData={itemData}
			config={config}
			metadata={metadata}
		/>
	) : null;

	return (
		<GalleryItemMarkup
			vm={vm}
			imageWrapperClass={imageWrapperClass}
			previewAdminToolbar={previewAdminToolbar}
			slotMeasureRef={needsSlotMeasure ? slotRef : undefined}
			videoPlayOverlay={videoPlayOverlay}
			videoPreviewNode={videoPreviewNode}
		/>
	);
}

export default memo(GalleryItem);
