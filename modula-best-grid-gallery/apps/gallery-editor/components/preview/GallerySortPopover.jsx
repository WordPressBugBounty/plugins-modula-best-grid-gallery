/**
 * Canvas toolbar Sort (canvas "1 · Editor"): the shared `CanvasSortPopover`
 * with the gallery's sort modes, where new images go, and the way into the
 * Reorder dialog (Pro).
 */
import { useCallback, useState } from '@wordpress/element';
import {
	CanvasSortPopover,
	useCanvasSortPopover,
	useTakeoverSaveStatus,
} from 'editor-shell';
import { useGallerySettingsFormBundle } from '../../form/GallerySettingsFormContext';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { useGallerySortMode } from '../../hooks/useGalleryReorderController';
import GalleryReorderDialog from '../gallery-reorder/GalleryReorderDialog';
import PreviewUploadPositionSegment, {
	PREVIEW_UPLOAD_POSITION_FIELD,
} from './PreviewUploadPositionSegment';

/**
 * @param {{ galleryId: number }} props
 */
export default function GallerySortPopover({ galleryId }) {
	const [reorderOpen, setReorderOpen] = useState(false);
	const { form } = useGallerySettingsFormBundle();
	const { errorMessage, clearError } = useTakeoverSaveStatus();
	const itemEdit = useGalleryItemEditSidebar();

	// The dialog returns focus to the Sort button on close. A saved order
	// moves the items under an open image panel, so it closes.
	const openReorderDialog = useCallback(() => {
		itemEdit?.close();
		setReorderOpen(true);
	}, [itemEdit]);

	const closeReorder = useCallback(() => setReorderOpen(false), []);

	const popover = useCanvasSortPopover(openReorderDialog);

	const { currentMode, sortRows, handleSortOptionClick } = useGallerySortMode(
		{ galleryId, onManualSorting: popover.openReorderIfStillOpen }
	);

	return (
		<CanvasSortPopover
			popover={popover}
			sortModes={sortRows}
			currentMode={currentMode}
			onChoose={handleSortOptionClick}
			insertPosition={
				<form.Field name={PREVIEW_UPLOAD_POSITION_FIELD}>
					{(fieldApi) => (
						<PreviewUploadPositionSegment
							value={fieldApi.state.value}
							onChange={(v) => fieldApi.handleChange(v)}
						/>
					)}
				</form.Field>
			}
			canReorder={currentMode === 'manual'}
			disabled={!galleryId}
			errorMessage={errorMessage}
			onDismissError={clearError}
		>
			<GalleryReorderDialog
				galleryId={galleryId}
				open={reorderOpen}
				onClose={closeReorder}
			/>
		</CanvasSortPopover>
	);
}
