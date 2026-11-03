/**
 * Selection mode (canvas "1 · Editor"): the preview gives way to editor-shell's
 * grid of checkbox thumbnails, one per image. A click or Space toggles a
 * thumbnail; Shift+click selects the range from the last one. The toolbar
 * carries Done selecting, Select all, "N selected · Clear" and Bulk edit.
 */
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { SelectionGrid } from 'editor-shell';
import { useGalleryPreviewTileSelection } from '../../../context/GalleryPreviewTileSelectionContext';
import { usePreviewReduxStoreItems } from '../../../hooks/usePreviewReduxStoreItems';
import { buildSelectionGridThumbs } from './selectionGridThumbs';

export default function GallerySelectionGrid() {
	const tileSelection = useGalleryPreviewTileSelection();
	const items = usePreviewReduxStoreItems(true);
	const thumbs = useMemo(() => buildSelectionGridThumbs(items), [items]);

	if (!tileSelection) {
		return null;
	}

	return (
		<SelectionGrid
			thumbs={thumbs}
			label={__('Select images', 'modula-best-grid-gallery')}
			isSelected={tileSelection.isSelected}
			onToggle={tileSelection.handleTileClick}
		/>
	);
}
