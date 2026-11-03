/** What the selected tile's toolbar runs, by item kind; only existing preview actions. */
import { __ } from '@wordpress/i18n';
import {
	isContentBlockGalleryItemRow,
	isEmbeddedGalleryItemRow,
	isGalleryPreviewVideoItem,
} from 'gallery-shared/preview';

/**
 * Edit label and the preview action that opens the item's panel, per kind.
 * Content blocks have their own panel; every other kind opens the item panel.
 */
const EDIT_BY_KIND = {
	image: {
		label: __('Edit image', 'modula-best-grid-gallery'),
		action: 'openEditMetadata',
	},
	video: {
		label: __('Edit video', 'modula-best-grid-gallery'),
		action: 'openEditMetadata',
	},
	shortcode: {
		label: __('Edit shortcode', 'modula-best-grid-gallery'),
		action: 'openEditMetadata',
	},
	contentBlock: {
		label: __('Edit content block', 'modula-best-grid-gallery'),
		action: 'openEditContentBlock',
	},
};

/**
 * @param {Object} item        Catalog row.
 * @param {string} galleryType `general.type`.
 * @return {keyof EDIT_BY_KIND} Item kind.
 */
function tileKind(item, galleryType) {
	if (isContentBlockGalleryItemRow(item)) {
		return 'contentBlock';
	}
	if (isEmbeddedGalleryItemRow(item)) {
		return 'shortcode';
	}
	return isGalleryPreviewVideoItem(item, galleryType) ? 'video' : 'image';
}

/**
 * @param {Object} item         Selected catalog row.
 * @param {number} storeIndex   Its store index.
 * @param {string} galleryType  `general.type`.
 * @param {Object} adminActions Preview admin actions.
 * @return {{
 *   edit: {label: string, onClick: Function}|null,
 *   onRemove: Function|null,
 * }} Toolbar actions; null where the preview has no such action. Remove
 * follows the tile trash: images and videos only.
 */
export function selectedTileActions(
	item,
	storeIndex,
	galleryType,
	adminActions
) {
	const { label, action } = EDIT_BY_KIND[tileKind(item, galleryType)];
	const openPanel = adminActions?.[action];
	const canRemove =
		!isEmbeddedGalleryItemRow(item) &&
		typeof adminActions?.removeItem === 'function';
	return {
		edit:
			typeof openPanel === 'function'
				? { label, onClick: () => openPanel(storeIndex) }
				: null,
		onRemove: canRemove ? () => adminActions.removeItem(storeIndex) : null,
	};
}
