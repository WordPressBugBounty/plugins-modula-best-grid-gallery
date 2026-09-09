/**
 * Settings-editor live preview tile chrome: click-to-select, watermark pick, lock badge.
 * Per-item actions live in the Image sidebar (no ⋮ overflow menu).
 *
 * @package
 */

import { useContext } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
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

/**
 * @param {Object} props
 * @param {Object} props.itemData Raw item passed to GalleryItem / SliderItem.
 */
export default function GalleryPreviewItemAdminToolbar({ itemData }) {
	const metadata = useSelector((s) => s.gallery.metadata);
	const config = useSelector((s) => s.gallery.config);
	const items = useSelector((s) => s.items.items);
	const ctx = useContext(GalleryPreviewAdminActionsContext);

	const isEditorPreviewChrome =
		metadata?.displayContext === 'settings-editor-preview' ||
		metadata?.staticStoryLayout === true;

	const storeIndex = findStoreIndexForItemId(
		items,
		previewItemRowLookupKey(itemData)
	);

	const isEmbedded = isEmbeddedGalleryItemRow(itemData);
	const isContentBlock = isContentBlockGalleryItemRow(itemData);
	const isVideoItem = isGalleryPreviewVideoItem(itemData, config?.type);
	const showGridLock =
		config?.type === 'custom-grid' &&
		isCustomGridPreviewLayoutEditable(config, metadata) &&
		typeof ctx?.toggleGridItemLock === 'function';
	const gridLocked = showGridLock && isGridItemLocked(itemData);

	if (!isEditorPreviewChrome || !ctx) {
		return null;
	}

	if (storeIndex < 0) {
		return null;
	}

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

	const tileSelectionActive =
		!wmSelectActive &&
		!isEmbedded &&
		!isContentBlock &&
		Boolean(ctx.tileSelectionActive);
	const tileSelected =
		tileSelectionActive &&
		typeof ctx.isTileSelected === 'function' &&
		ctx.isTileSelected(storeIndex);

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
	const tileSelectClass = tileSelectionActive
		? ` modula-gallery-preview-item-admin--tile-select${
				tileSelected ? ' is-tile-selected' : ''
			}`
		: '';
	const itemEditSelected =
		!wmSelectActive &&
		!tileSelectionActive &&
		!isEmbedded &&
		typeof ctx.isItemEditSelected === 'function' &&
		ctx.isItemEditSelected(storeIndex);
	const editSelectedClass = itemEditSelected ? ' is-item-edit-selected' : '';

	const onSelectTile = (e) => {
		stop(e);
		if (tileSelectionActive) {
			ctx.handleTileSelectionClick?.(storeIndex, e);
			return;
		}
		if (e.shiftKey && typeof ctx.handleTileSelectionClick === 'function') {
			ctx.handleTileSelectionClick(storeIndex, e);
			return;
		}
		if (isContentBlock && typeof ctx.openEditContentBlock === 'function') {
			ctx.openEditContentBlock(storeIndex);
			return;
		}
		if (!isEmbedded) {
			ctx.openEditMetadata(storeIndex);
		}
	};

	const canSelect =
		!wmSelectActive &&
		(isContentBlock
			? typeof ctx.openEditContentBlock === 'function'
			: !isEmbedded);

	return (
		<div
			className={`modula-gallery-preview-item-admin${wmClass}${tileSelectClass}${editSelectedClass}`}
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
					aria-pressed={
						tileSelectionActive ? tileSelected : itemEditSelected
					}
					aria-label={
						tileSelectionActive
							? tileSelected
								? __(
										'Deselect image',
										'modula-best-grid-gallery'
									)
								: __('Select image', 'modula-best-grid-gallery')
							: isContentBlock
								? __(
										'Edit content block',
										'modula-best-grid-gallery'
									)
								: isVideoItem
									? __(
											'Select video to edit',
											'modula-best-grid-gallery'
										)
									: __(
											'Select image to edit',
											'modula-best-grid-gallery'
										)
					}
					onClick={onSelectTile}
				/>
			) : null}
			{tileSelectionActive ? (
				<button
					type="button"
					className="modula-gallery-preview-item-admin__pick"
					aria-pressed={tileSelected}
					aria-label={
						tileSelected
							? __('Deselect image', 'modula-best-grid-gallery')
							: __('Select image', 'modula-best-grid-gallery')
					}
					{...stopPointer}
					onClick={onSelectTile}
				>
					<svg
						width="11"
						height="11"
						viewBox="0 0 24 24"
						fill="none"
						aria-hidden="true"
						focusable="false"
					>
						<path
							d="m20 6-11 11-5-5"
							stroke="currentColor"
							strokeWidth="3.2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			) : null}
			<div
				className="modula-gallery-preview-item-admin__shade"
				aria-hidden="true"
			/>
			{showGridLock && !tileSelectionActive ? (
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
		</div>
	);
}
