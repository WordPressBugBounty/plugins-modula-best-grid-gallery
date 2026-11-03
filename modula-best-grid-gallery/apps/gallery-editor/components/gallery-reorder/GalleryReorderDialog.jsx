/**
 * Reorder dialog (canvas "1 · Editor", `reorder.open`), opened from the Sort
 * popover's "Open drag-and-drop reorder" (Pro): the shared
 * `CanvasReorderDialog` over the gallery's items. Content blocks keep their
 * pencil.
 */
import { __, _n, sprintf } from '@wordpress/i18n';
import { CanvasReorderDialog } from 'editor-shell';
import { useGalleryReorderController } from '../../hooks/useGalleryReorderController';
import { useModulaSettingsEditorConfig } from '../../hooks/useModulaSettingsEditorConfig';

/**
 * @param {string} postTitle
 * @param {number} galleryId
 * @return {string} Dialog title, "Reorder · Slider 3.0" in the canvas.
 */
function reorderTitle(postTitle, galleryId) {
	if (postTitle) {
		return sprintf(
			/* translators: %s: gallery title */
			__('Reorder · %s', 'modula-best-grid-gallery'),
			postTitle
		);
	}
	return sprintf(
		/* translators: %d: gallery id */
		__('Reorder · Gallery #%d', 'modula-best-grid-gallery'),
		galleryId
	);
}

/**
 * @param {number} count
 * @return {string} "12 photos · drag a photo to its new place, or use the arrows."
 */
function reorderSubtitle(count) {
	return sprintf(
		/* translators: %d: number of items in the gallery */
		_n(
			'%d photo · drag a photo to its new place, or use the arrows.',
			'%d photos · drag a photo to its new place, or use the arrows.',
			count,
			'modula-best-grid-gallery'
		),
		count
	);
}

/**
 * @param {Object}   row                  A row of `buildGalleryReorderRows`.
 * @param {Function} openContentBlockEdit Opens a content block's panel.
 * @return {Object} The row's tile for `CanvasReorderDialog`; a content block keeps its pencil.
 */
function reorderItem(row, openContentBlockEdit) {
	const item = {
		id: row.sortKey,
		label: row.label,
		thumb: row.thumb,
		blockBg: row.blockBg,
	};
	if (row.rowType !== 'content_block') {
		return item;
	}
	return {
		...item,
		edit: {
			label: __('Edit content block', 'modula-best-grid-gallery'),
			onClick: () => openContentBlockEdit(row.rawRow),
		},
	};
}

/**
 * @param {{ galleryId: number, onClose: () => void }} props
 */
function GalleryReorderDialogContent({ galleryId, onClose }) {
	const editor = useModulaSettingsEditorConfig();
	const {
		orderedRows,
		openContentBlockEdit,
		onDragEnd,
		moveOrderKey,
		applyManualOrder,
	} = useGalleryReorderController({ galleryId, onClose });

	const items = orderedRows.map((row) =>
		reorderItem(row, openContentBlockEdit)
	);

	return (
		<CanvasReorderDialog
			title={reorderTitle(editor.postTitle || '', galleryId)}
			subtitle={reorderSubtitle(orderedRows.length)}
			emptyMessage={__(
				'No items in this gallery yet.',
				'modula-best-grid-gallery'
			)}
			items={items}
			onDragEnd={onDragEnd}
			onMove={moveOrderKey}
			onSave={applyManualOrder}
			onClose={onClose}
		/>
	);
}

/**
 * Mounted only while open, so each opening starts from the saved order.
 * The key remounts it when the gallery changes.
 *
 * @param {{ galleryId: number, open: boolean, onClose: () => void }} props
 */
export default function GalleryReorderDialog({ galleryId, open, onClose }) {
	if (!open || !galleryId) {
		return null;
	}
	return (
		<GalleryReorderDialogContent
			key={galleryId}
			galleryId={galleryId}
			onClose={onClose}
		/>
	);
}
