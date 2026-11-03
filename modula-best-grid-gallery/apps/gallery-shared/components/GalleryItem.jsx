/**
 * Single gallery item: image, overlay, optional caption/link.
 * Layouts use this for grids; slider uses SliderItem (Fancybox empty-anchor behavior).
 *
 * @package
 */

import { memo, useContext } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { GalleryPreviewHoverTileContext } from '../context/GalleryPreviewHoverTileContext';
import { GalleryItemChromeContext } from '../context/GalleryItemChromeContext';
import { GalleryItemContentContext } from '../context/GalleryItemContentContext';
import { getGalleryItemViewModel } from '../utils/galleryItemViewModel';
import { useSlotDimensions } from '../hooks/useSlotDimensions';
import { isEmbeddedGalleryItemRow } from '../utils/embeddedGalleryItemKinds';
import { listDeeplinkItems } from '../lightbox/modulaDeeplinkFromHash';
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

function GalleryItem({
	itemData,
	catalogIndex,
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
	const previewHoverTile = useContext(GalleryPreviewHoverTileContext);
	const renderItemChrome = useContext(GalleryItemChromeContext);
	const renderItemContent = useContext(GalleryItemContentContext);
	/*
	 * Primitive deeplink index — avoid selecting the full items array so
	 * unrelated content-block patches do not re-render every image tile.
	 * Counted over the unfiltered gallery so a shared link names the same
	 * image whichever filter is active.
	 */
	const deeplinkIndex = useSelector((s) => {
		const hasItemId = itemData?.id !== undefined && itemData?.id !== null;
		if (!hasItemId || isEmbeddedGalleryItemRow(itemData)) {
			return -1;
		}
		const catalogItems = s.items?.originalItems?.length
			? s.items.originalItems
			: s.items?.items;
		return listDeeplinkItems(catalogItems, config).findIndex(
			(row) => row.id === itemData.id
		);
	});

	if (isEmbeddedGalleryItemRow(itemData)) {
		return (
			<EmbeddedGalleryItem
				catalogIndex={catalogIndex}
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
	 * Direct / Go to URL / attachment-page) so click opens Image edit.
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
		hoverTile: previewHoverTile,
		deeplinkIndex: deeplinkIndex >= 0 ? deeplinkIndex : undefined,
	});

	if (!vm) {
		return null;
	}

	const previewAdminToolbar = isPreviewContext ? (
		<GalleryPreviewAdminToolbarSlot
			itemData={itemData}
			catalogIndex={catalogIndex}
		/>
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
			icon={videoSettings.videoIconIcon}
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
			itemChrome={renderItemChrome ? renderItemChrome(itemData) : null}
			renderItemContent={renderItemContent}
			slotMeasureRef={needsSlotMeasure ? slotRef : undefined}
			videoPlayOverlay={videoPlayOverlay}
			videoPreviewNode={videoPreviewNode}
		/>
	);
}

export default memo(GalleryItem);
