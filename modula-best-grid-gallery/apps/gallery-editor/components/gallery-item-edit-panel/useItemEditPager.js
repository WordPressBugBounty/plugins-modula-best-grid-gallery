/**
 * Previous/next for the item edit panels, in gallery order.
 *
 * Opening another item remounts the panel (it is keyed by store index), and
 * the panel's unmount flush saves the edits still waiting for the autosave,
 * the same path as clicking another tile on the canvas.
 */
import { useMemo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { useGalleryItemEditSidebar } from '../../context/GalleryItemEditSidebarContext';
import { getGalleryItemEditPager } from '../../utils/galleryItemEditNavigation';

/**
 * The pager pages over images and content blocks, so it says "Image" only
 * when the gallery has no content blocks.
 *
 * @param {import('../../utils/galleryItemEditNavigation').GalleryItemEditPager} pager
 * @return {{ title: string, previousLabel: string, nextLabel: string }} Header copy.
 */
function pagerCopy({ position, total, onlyImages }) {
	if (onlyImages) {
		return {
			title: sprintf(
				/* translators: 1: the image's place in the gallery, 2: images in the gallery. */
				__('Image %1$d of %2$d', 'modula-best-grid-gallery'),
				position,
				total
			),
			previousLabel: __('Previous image', 'modula-best-grid-gallery'),
			nextLabel: __('Next image', 'modula-best-grid-gallery'),
		};
	}
	return {
		title: sprintf(
			/* translators: 1: the item's place in the gallery, 2: images and content blocks in the gallery. */
			__('Item %1$d of %2$d', 'modula-best-grid-gallery'),
			position,
			total
		),
		previousLabel: __('Previous item', 'modula-best-grid-gallery'),
		nextLabel: __('Next item', 'modula-best-grid-gallery'),
	};
}

/**
 * @param {Object[]} reduxItems
 * @param {number}   storeIndex Item open in the panel.
 * @param {string}   fallbackTitle Title when the item is not in the pager.
 * @return {{
 *   title: string,
 *   previousLabel?: string,
 *   nextLabel?: string,
 *   onPrevious: (() => void)|null,
 *   onNext: (() => void)|null,
 * }} `ItemEditPanelHeader` props besides `onBack`.
 */
export function useItemEditPager(reduxItems, storeIndex, fallbackTitle) {
	const open = useGalleryItemEditSidebar()?.open;

	return useMemo(() => {
		const pager = getGalleryItemEditPager(reduxItems, storeIndex);
		if (!pager || typeof open !== 'function') {
			return { title: fallbackTitle, onPrevious: null, onNext: null };
		}
		const { previousIndex, nextIndex } = pager;
		return {
			...pagerCopy(pager),
			onPrevious:
				previousIndex === null ? null : () => open(previousIndex),
			onNext: nextIndex === null ? null : () => open(nextIndex),
		};
	}, [fallbackTitle, open, reduxItems, storeIndex]);
}

/**
 * Remove for the item edit panels: save pending edits first, so the removal
 * (an `items` history step with Undo in the canvas toast) records the item
 * as last edited, and the next item opened at the same store index does not
 * inherit them. A failed save (logged by the autosave) keeps the item.
 *
 * @param {() => Promise<void>} flush      The panel's autosave flush.
 * @param {number}              storeIndex
 * @param {Object|null}         adminActions Preview admin actions.
 * @return {() => void} The Remove handler.
 */
export function removeAfterFlush(flush, storeIndex, adminActions) {
	return () => {
		flush().then(
			() => adminActions?.removeItem?.(storeIndex),
			() => {
				// Nothing to undo: the item stays with its unsaved edits.
			}
		);
	};
}
