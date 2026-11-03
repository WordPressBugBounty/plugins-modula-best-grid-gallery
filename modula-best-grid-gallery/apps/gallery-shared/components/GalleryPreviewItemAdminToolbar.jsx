/**
 * Settings-editor live preview tile chrome: click-to-select (double-click
 * opens the item's panel when the host offers `openItem`), the selected
 * tile's toolbar (the host's `SelectedTileToolbar` slot), watermark pick,
 * lock badge and the "Remove from gallery" trash button.
 * Per-item actions live in the Image sidebar (no ⋮ overflow menu).
 * Multi-select has its own grid (gallery editor selection mode), not tile chrome.
 *
 * @package
 */

import { useContext, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Icon, lock } from '@wordpress/icons';
import { useSelector } from 'react-redux';
import { GalleryPreviewAdminActionsContext } from '../context/GalleryPreviewAdminActionsContext';
import { isGridItemLocked } from '../utils/customGridLayout';
import { isCustomGridPreviewLayoutEditable } from '../utils/resolvePreviewViewport';
import {
	findStoreIndexForItemId,
	previewItemRowLookupKey,
} from '../utils/galleryItemIdentity';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
} from '../utils/embeddedGalleryItemKinds';
import { isGalleryPreviewVideoItem } from '../video/videoGalleryModel';
import {
	INITIAL_TILE_PRESSES,
	isStillDoubleClick,
	tilePressDown,
	tilePressUp,
} from '../utils/tilePresses';
import TileTrashButton from './TileTrashButton';

/**
 * @param {Object} itemData
 * @return {string} Accessible name of the tile's trash button.
 */
function removeFromGalleryLabel(itemData) {
	const title =
		typeof itemData?.title === 'string'
			? itemData.title.replace(/<[^>]*>/g, '').trim()
			: '';
	if (title === '') {
		return __('Remove from gallery', 'modula-best-grid-gallery');
	}
	return sprintf(
		/* translators: %s: image title */
		__('Remove %s from gallery', 'modula-best-grid-gallery'),
		title
	);
}

/**
 * @param {{ isContentBlock: boolean, isFreeformShortcode: boolean, isVideoItem: boolean }} kind What the tile holds.
 * @return {string} The gallery's accessible name of the tile's select hit.
 */
function selectTileLabel({ isContentBlock, isFreeformShortcode, isVideoItem }) {
	if (isContentBlock) {
		return __('Edit content block', 'modula-best-grid-gallery');
	}
	if (isFreeformShortcode) {
		return __('Select shortcode to edit', 'modula-best-grid-gallery');
	}
	if (isVideoItem) {
		return __('Select video to edit', 'modula-best-grid-gallery');
	}
	return __('Select image to edit', 'modula-best-grid-gallery');
}

/**
 * @param {Object} props
 * @param {Object} props.itemData     Raw item passed to GalleryItem / SliderItem.
 * @param          props.catalogIndex
 */
export default function GalleryPreviewItemAdminToolbar({
	itemData,
	catalogIndex,
}) {
	const metadata = useSelector((s) => s.gallery.metadata);
	const config = useSelector((s) => s.gallery.config);
	const items = useSelector((s) => s.items.items);
	const ctx = useContext(GalleryPreviewAdminActionsContext);
	const pressesRef = useRef(INITIAL_TILE_PRESSES);

	const isEditorPreviewChrome =
		metadata?.displayContext === 'settings-editor-preview' ||
		metadata?.staticStoryLayout === true;

	const storeIndex = Number.isInteger(catalogIndex)
		? catalogIndex
		: findStoreIndexForItemId(items, previewItemRowLookupKey(itemData));

	if (!isEditorPreviewChrome || !ctx) {
		return null;
	}

	if (storeIndex < 0) {
		return null;
	}

	const isEmbedded = isEmbeddedGalleryItemRow(itemData);
	const isContentBlock = isContentBlockGalleryItemRow(itemData);
	const isVideoItem = isGalleryPreviewVideoItem(itemData, config?.type);
	const showGridLock =
		config?.type === 'custom-grid' &&
		isCustomGridPreviewLayoutEditable(config, metadata) &&
		typeof ctx?.toggleGridItemLock === 'function';
	const gridLocked = showGridLock && isGridItemLocked(itemData);

	const isFreeformShortcode =
		config?.type === 'freeform' && isEmbedded && !isContentBlock;

	const attachmentId = Number(itemData?.id);
	const wmSelectActive =
		Boolean(ctx.watermarkSelectionActive) &&
		!isEmbedded &&
		Number.isFinite(attachmentId) &&
		attachmentId > 0;
	const wmSelected =
		wmSelectActive &&
		typeof ctx.isWatermarkSelected === 'function' &&
		ctx.isWatermarkSelected(attachmentId);
	const showTrash =
		!wmSelectActive && !isEmbedded && typeof ctx.removeItem === 'function';

	const stop = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const stopPointer = {
		onMouseDown: stop,
		onPointerDown: stop,
	};

	const wmClass = wmSelectActive
		? ` modula-gallery-preview-item-admin--wm-select${
				wmSelected ? ' is-wm-selected' : ''
			}`
		: '';
	const canSelect =
		!wmSelectActive &&
		typeof ctx.selectItem === 'function' &&
		(isContentBlock
			? typeof ctx.openEditContentBlock === 'function'
			: !isEmbedded || isFreeformShortcode);
	const itemSelected =
		canSelect &&
		typeof ctx.isItemSelected === 'function' &&
		ctx.isItemSelected(storeIndex);
	const selectedClass = itemSelected ? ' is-item-selected' : '';
	// The editor's toolbar for the selected tile (Edit, Remove); none in other hosts.
	const SelectedTileToolbar = itemSelected ? ctx.SelectedTileToolbar : null;
	// A host's labels on every tile (the Albums editor's member kind).
	const TileLabels = ctx.TileLabels ?? null;
	// A host's words for the select hit and the trash; the gallery's otherwise.
	const hostCopy = ctx.tileCopy ? ctx.tileCopy(itemData) : null;

	// A click selects; the selected tile's toolbar opens the item's panel.
	const onSelectTile = (e) => {
		stop(e);
		ctx.selectItem(storeIndex, { shiftKey: e.shiftKey });
	};
	// A double-click opens it directly, unless one of its presses dragged or
	// resized the tile. The presses are only watched; the layout's drag owns them.
	const pressHandlers = {
		onPointerDown: (e) => {
			pressesRef.current = tilePressDown(pressesRef.current, e);
		},
		onPointerUp: (e) => {
			pressesRef.current = tilePressUp(pressesRef.current, e);
		},
		onPointerCancel: () => {
			pressesRef.current = INITIAL_TILE_PRESSES;
		},
	};
	const onOpenTile = (e) => {
		stop(e);
		if (
			typeof ctx.openItem === 'function' &&
			isStillDoubleClick(pressesRef.current, e)
		) {
			ctx.openItem(storeIndex);
		}
	};

	return (
		<div
			className={`modula-gallery-preview-item-admin${wmClass}${selectedClass}`}
		>
			{wmSelectActive ? (
				<button
					type="button"
					className="modula-gallery-preview-item-admin__wm-select-btn"
					aria-pressed={wmSelected}
					aria-label={
						wmSelected
							? __(
									'Deselect for watermark',
									'modula-best-grid-gallery'
								)
							: __(
									'Select for watermark',
									'modula-best-grid-gallery'
								)
					}
					{...stopPointer}
					onClick={(e) => {
						stop(e);
						ctx.toggleWatermarkSelection?.(attachmentId);
					}}
				>
					<span
						className="modula-gallery-preview-item-admin__wm-select-check"
						aria-hidden="true"
					>
						{wmSelected ? '✓' : ''}
					</span>
				</button>
			) : canSelect ? (
				<button
					type="button"
					className="modula-gallery-preview-item-admin__select-hit"
					aria-pressed={itemSelected}
					aria-label={
						hostCopy?.select ??
						selectTileLabel({
							isContentBlock,
							isFreeformShortcode,
							isVideoItem,
						})
					}
					{...pressHandlers}
					onClick={onSelectTile}
					onDoubleClick={onOpenTile}
				/>
			) : null}
			{TileLabels ? (
				<TileLabels storeIndex={storeIndex} itemData={itemData} />
			) : null}
			{SelectedTileToolbar ? (
				<SelectedTileToolbar
					storeIndex={storeIndex}
					itemData={itemData}
				/>
			) : null}
			{showGridLock ? (
				<button
					type="button"
					className={`modula-gallery-preview-item-admin__lock-badge${
						gridLocked
							? ''
							: ' modula-gallery-preview-item-admin__lock-badge--inactive'
					}`}
					title={
						gridLocked
							? __(
									'Position locked — click to unlock',
									'modula-best-grid-gallery'
								)
							: __(
									'Lock position so this tile does not move when rearranging',
									'modula-best-grid-gallery'
								)
					}
					aria-pressed={gridLocked}
					aria-label={
						gridLocked
							? __('Unlock position', 'modula-best-grid-gallery')
							: __('Lock position', 'modula-best-grid-gallery')
					}
					{...stopPointer}
					onClick={(e) => {
						stop(e);
						ctx.toggleGridItemLock?.(storeIndex);
					}}
				>
					<Icon icon={lock} size={14} />
				</button>
			) : null}
			{showTrash ? (
				<TileTrashButton
					className="modula-gallery-preview-item-admin__trash"
					title={
						hostCopy?.removeTitle ??
						__('Remove from gallery', 'modula-best-grid-gallery')
					}
					label={hostCopy?.remove ?? removeFromGalleryLabel(itemData)}
					onRemove={() => ctx.removeItem(storeIndex)}
				/>
			) : null}
		</div>
	);
}
