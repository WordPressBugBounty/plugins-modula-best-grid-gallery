/**
 * When custom-grid pagination is toggled, clear absolute coords and repack / reflow.
 */
import {
	measureCustomGridPreviewWidth,
	reflowCustomGridAfterPaginationDisable,
	repackCustomGridAfterPaginationEnable,
} from 'gallery-shared/preview';
import { useLayoutEffect, useRef } from '@wordpress/element';

/**
 * @param {unknown} value
 * @return {boolean}
 */
function isPaginationEnabled(value) {
	if (value === true || value === 1 || value === '1') {
		return true;
	}
	if (typeof value === 'string' && value.toLowerCase().trim() === 'true') {
		return true;
	}
	return false;
}

/**
 * @param {{
 *   store: import('@reduxjs/toolkit').Store|null,
 *   galleryType: string,
 *   enablePagination: unknown,
 *   schedulePersistPreviewItems: () => void,
 * }} args
 */
export function useCustomGridPaginationLayoutEffect({
	store,
	galleryType,
	enablePagination,
	schedulePersistPreviewItems,
}) {
	const prevEnabledRef = useRef(/** @type {boolean|null} */ (null));

	useLayoutEffect(() => {
		if (!store || galleryType !== 'custom-grid') {
			prevEnabledRef.current = isPaginationEnabled(enablePagination);
			return;
		}

		const enabled = isPaginationEnabled(enablePagination);
		const prev = prevEnabledRef.current;
		prevEnabledRef.current = enabled;

		// Skip first mount — only react to user toggles.
		if (prev === null || prev === enabled) {
			return;
		}

		const config = store.getState()?.gallery?.config || {};
		const width = measureCustomGridPreviewWidth();
		let changed = false;

		if (!prev && enabled) {
			changed = repackCustomGridAfterPaginationEnable(
				store,
				{ ...config, type: 'custom-grid' },
				width
			);
		} else if (prev && !enabled) {
			changed = reflowCustomGridAfterPaginationDisable(
				store,
				{ ...config, type: 'custom-grid' },
				width
			);
		}

		if (changed) {
			schedulePersistPreviewItems();
		}
	}, [store, galleryType, enablePagination, schedulePersistPreviewItems]);
}
