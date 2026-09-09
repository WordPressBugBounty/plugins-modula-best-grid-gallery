/**
 * Fit grid always shows the full image — clear stored focal crop/point when the
 * layout policy says image focus is not supported.
 *
 * @package
 */

import {
	asGalleryItemList,
	getLayoutPolicy,
} from 'gallery-shared/preview';
import { useEffect, useRef } from '@wordpress/element';
import { clearAllGalleryImageFocus } from '../utils/clearAllGalleryImageFocus';
import { itemHasImageFocusData } from '../utils/itemHasImageFocus';

/**
 * @param {{
 *   galleryId: number,
 *   galleryType: string,
 *   storeRef: import('react').MutableRefObject<import('@reduxjs/toolkit').Store|null>,
 *   runPersistTask?: (task: () => Promise<unknown>) => Promise<unknown>,
 * }} args
 */
export function useFitGridClearImageFocus({
	galleryId,
	galleryType,
	storeRef,
	runPersistTask,
}) {
	const clearingRef = useRef(false);
	const wasImageFocusSupportedRef = useRef(true);

	useEffect(() => {
		const supportsImageFocus = getLayoutPolicy({
			general: { type: galleryType },
		}).capabilities.imageFocus;
		const wasSupported = wasImageFocusSupportedRef.current;
		wasImageFocusSupportedRef.current = supportsImageFocus;

		if (supportsImageFocus || !galleryId || !storeRef.current) {
			return;
		}

		if (!wasSupported) {
			return;
		}

		const items = storeRef.current.getState()?.items?.items;
		const hasFocus =
			Array.isArray(items) &&
			asGalleryItemList(items).some((row) =>
				itemHasImageFocusData(row)
			);

		if (!hasFocus || clearingRef.current) {
			return;
		}

		clearingRef.current = true;
		const clearTask = () =>
			clearAllGalleryImageFocus({
				galleryId,
				store: storeRef.current,
			});

		(async () => {
			try {
				if (typeof runPersistTask === 'function') {
					await runPersistTask(clearTask);
				} else {
					await clearTask();
				}
			} catch (e) {
				// eslint-disable-next-line no-console
				console.error(e);
			} finally {
				clearingRef.current = false;
			}
		})();
	}, [galleryId, galleryType, runPersistTask, storeRef]);
}
