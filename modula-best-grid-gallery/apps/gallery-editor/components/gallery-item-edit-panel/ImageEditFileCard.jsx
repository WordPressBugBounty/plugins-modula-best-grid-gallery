/**
 * Image edit panel — the file: thumbnail, name and size, Replace and Remove,
 * then the tile actions the gallery type offers (Image focus, position lock,
 * move to another page).
 */
import {
	getLayoutPolicy,
	getPreviewItemPageMoveAvailability,
	isGridItemLocked,
} from 'gallery-shared/preview';
import { useId, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from 'admin-ui';
import { ItemEditCard } from 'editor-shell';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGalleryPreviewAdminActionsOptional } from '../../hooks/useGalleryPreviewAdminActionsOptional';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';
import {
	boundGalleryAllowsReplace,
	getBoundGalleryRemoveCopy,
	getBoundGallerySummaryFromEditor,
} from '../../utils/boundGalleryChromePolicy';
import { getGalleryPreviewReduxStore } from '../../utils/previewReduxStoreRef';
import ItemEditTipToggleRow from './ItemEditTipToggleRow';

/**
 * @param {Object[]} reduxItems
 * @param {number}   storeIndex
 * @param {string}   galleryType
 * @param {Object}   adminActions
 * @return {{ canPrevious: boolean, canNext: boolean }} Which page moves apply.
 */
function resolvePageMove(reduxItems, storeIndex, galleryType, adminActions) {
	if (
		galleryType !== 'custom-grid' ||
		typeof adminActions?.moveItemToPreviousPage !== 'function'
	) {
		return { canPrevious: false, canNext: false };
	}
	const state = getGalleryPreviewReduxStore()?.getState?.();
	return getPreviewItemPageMoveAvailability(
		reduxItems,
		storeIndex,
		state?.gallery?.settings,
		state?.gallery?.config
	);
}

/**
 * @param {Object}     props
 * @param {number}     props.storeIndex
 * @param {Object}     props.item        Redux gallery row.
 * @param {Object[]}   props.reduxItems
 * @param {string}     props.galleryType
 * @param {string}     props.thumbSrc
 * @param {string}     props.fileName
 * @param {string}     props.meta        Dimensions and file size.
 * @param {() => void} props.onRemove    Removes at once; the canvas toast offers Undo.
 */
export default function ImageEditFileCard({
	storeIndex,
	item,
	reduxItems,
	galleryType,
	thumbSrc,
	fileName,
	meta,
	onRemove,
}) {
	const editor = useModulaSettingsEditorConfig();
	const adminActions = useGalleryPreviewAdminActionsOptional();
	const itemEdit = useGalleryItemEditSidebar();
	const baseId = `modula-item-file-${useId()}`;
	const removeHelpId = `${baseId}-remove-help`;

	const boundSummary = getBoundGallerySummaryFromEditor(editor);
	const allowReplace = boundGalleryAllowsReplace(boundSummary);
	const { isHide } = getBoundGalleryRemoveCopy(boundSummary, {
		isSourceImage: true,
	});
	const removeHelp = isHide
		? __(
				'Hiding it here leaves the file on the bind target.',
				'modula-best-grid-gallery'
			)
		: __(
				'Removing it here leaves the file in the media library.',
				'modula-best-grid-gallery'
			);

	const showImageFocus =
		typeof itemEdit?.openFocus === 'function' &&
		getLayoutPolicy({ general: { type: galleryType } }).capabilities
			.imageFocus;
	const showGridLock = galleryType === 'custom-grid';
	const pageMove = useMemo(
		() =>
			resolvePageMove(reduxItems, storeIndex, galleryType, adminActions),
		[adminActions, galleryType, reduxItems, storeIndex]
	);
	const showPageMove = pageMove.canPrevious || pageMove.canNext;

	return (
		<ItemEditCard className="modula-gallery-item-edit-panel__file">
			<div className="modula-gallery-item-edit-panel__file-summary">
				{thumbSrc ? (
					<img
						className="modula-gallery-item-edit-panel__file-thumb"
						src={thumbSrc}
						alt=""
					/>
				) : null}
				<div className="modula-gallery-item-edit-panel__file-text">
					<span className="modula-gallery-item-edit-panel__file-name">
						{fileName}
					</span>
					{meta ? (
						<span className="modula-gallery-item-edit-panel__file-meta">
							{meta}
						</span>
					) : null}
				</div>
			</div>
			<div className="modula-gallery-item-edit-panel__button-grid">
				{allowReplace ? (
					<Button
						disabled={!adminActions?.openReplaceMedia}
						onClick={() =>
							adminActions?.openReplaceMedia?.(storeIndex)
						}
					>
						{__('Replace', 'modula-best-grid-gallery')}
					</Button>
				) : null}
				<Button
					className="modula-gallery-item-edit-panel__remove"
					disabled={!adminActions?.removeItem}
					onClick={onRemove}
					aria-describedby={removeHelpId}
				>
					{isHide
						? __('Hide', 'modula-best-grid-gallery')
						: __('Remove', 'modula-best-grid-gallery')}
				</Button>
			</div>
			{/* The canvas shows no help here; the Undo toast follows a removal. */}
			<span id={removeHelpId} className="screen-reader-text">
				{removeHelp}
			</span>
			{showImageFocus ? (
				<Button
					className="modula-gallery-item-edit-panel__wide-button"
					onClick={() => itemEdit.openFocus(storeIndex)}
				>
					{__('Image focus', 'modula-best-grid-gallery')}
				</Button>
			) : null}
			{showGridLock ? (
				<ItemEditTipToggleRow
					label={__('Lock position', 'modula-best-grid-gallery')}
					help={__(
						'Locked tiles stay put when you rearrange the grid.',
						'modula-best-grid-gallery'
					)}
					checked={isGridItemLocked(item)}
					disabled={!adminActions?.toggleGridItemLock}
					onChange={() =>
						adminActions?.toggleGridItemLock?.(storeIndex)
					}
				/>
			) : null}
			{showPageMove ? (
				<div className="modula-gallery-item-edit-panel__button-grid">
					<Button
						disabled={!pageMove.canPrevious}
						onClick={() =>
							adminActions?.moveItemToPreviousPage?.(storeIndex)
						}
					>
						{__('Previous page', 'modula-best-grid-gallery')}
					</Button>
					<Button
						disabled={!pageMove.canNext}
						onClick={() =>
							adminActions?.moveItemToNextPage?.(storeIndex)
						}
					>
						{__('Next page', 'modula-best-grid-gallery')}
					</Button>
				</div>
			) : null}
		</ItemEditCard>
	);
}
