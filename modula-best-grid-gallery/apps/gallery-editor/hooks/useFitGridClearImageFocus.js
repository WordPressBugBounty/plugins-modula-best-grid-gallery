/**
 * Fit grid always shows the full image — clear stored focal crop/point when the
 * layout policy says image focus is not supported.
 *
 * @package
 */

import { getLayoutPolicy } from 'gallery-shared/preview';
import { useEffect, useRef } from '@wordpress/element';
import { clearAllGalleryImageFocus } from '../utils/clearAllGalleryImageFocus';

/**
 * Switching to a layout without image focus clears it in the store, an
 * unsaved change the editor save stores (ADR 0059). Opening a gallery stored
 * with such a layout clears it as a derived change: that layout ignores the
 * focus, so the editor does not open with unsaved changes.
 *
 * @param {{
 *   galleryId: number,
 *   galleryType: string,
 *   storeRef: import('react').MutableRefObject<import('@reduxjs/toolkit').Store|null>,
 *   commitDerivedItems: (catalog: Object[]) => void,
 * }} args
 */
export function useFitGridClearImageFocus({
	galleryId,
	galleryType,
	storeRef,
	commitDerivedItems,
}) {
	const wasImageFocusSupportedRef = useRef(null);

	useEffect(() => {
		const supportsImageFocus = getLayoutPolicy({
			general: { type: galleryType },
		}).capabilities.imageFocus;
		const wasSupported = wasImageFocusSupportedRef.current;
		wasImageFocusSupportedRef.current = supportsImageFocus;

		if (supportsImageFocus || wasSupported === false || !storeRef.current) {
			return;
		}
		const isOpening = wasSupported === null;
		clearAllGalleryImageFocus({
			galleryId,
			store: storeRef.current,
			...(isOpening ? { commitCatalog: commitDerivedItems } : {}),
		});
	}, [galleryId, galleryType, storeRef, commitDerivedItems]);
}
