/**
 * The toolbar inside the selected tile, for every type but an arrangeable
 * Freeform (which draws its own beside the tile, with stacking). Inside the
 * tile because most layouts clip their tiles; placed at the canvas's
 * near-top offset. Rendered through the preview admin actions' slot.
 */
import { useContext } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { GalleryPreviewAdminActionsContext } from 'gallery-shared/preview';
import { canArrangeFreeform } from '../../utils/canArrangeFreeform';
import { selectedTileActions } from '../../utils/selectedTileActions';
import TileToolbar, { TILE_SELECT_BUTTON_SELECTOR } from './TileToolbar';

const findSelectButton = (toolbar) =>
	toolbar
		.closest('.modula-gallery-preview-item-admin')
		?.querySelector(TILE_SELECT_BUTTON_SELECTOR) ?? null;

/**
 * @param {Object} props
 * @param {number} props.storeIndex Selected store index.
 * @param {Object} props.itemData   Selected catalog row.
 */
export default function SelectedTileToolbar({ storeIndex, itemData }) {
	const adminActions = useContext(GalleryPreviewAdminActionsContext);
	const galleryType = useSelector((state) => state.gallery.config?.type);
	if (
		galleryType === 'freeform' &&
		canArrangeFreeform(adminActions?.previewViewport)
	) {
		return null;
	}
	const { edit, onRemove } = selectedTileActions(
		itemData,
		storeIndex,
		galleryType,
		adminActions
	);
	return (
		<TileToolbar
			className="modula-tile-toolbar--in-tile"
			findSelectButton={findSelectButton}
			edit={edit}
			onRemove={onRemove}
		/>
	);
}
