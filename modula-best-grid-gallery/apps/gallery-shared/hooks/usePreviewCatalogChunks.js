/**
 * Page groups for preview page dividers from the gallery store.
 *
 * @package
 */

import { useMemo } from '@wordpress/element';
import { useSelector } from 'react-redux';
import { previewCatalogPagesFromGalleryState } from '../utils/previewCatalogPages';

/**
 * @param {unknown} items    Preview catalog (gallery items).
 * @param {Object}  [config] Gallery flat config (layout type + preview viewport).
 * @return {Object[][]} Page groups; layouts paint dividers between them.
 */
export function usePreviewCatalogChunks(items, config) {
	const settings = useSelector((state) => state.gallery.settings);
	const metadata = useSelector((state) => state.gallery.metadata);
	return useMemo(
		() =>
			previewCatalogPagesFromGalleryState(items, {
				settings,
				metadata,
				config,
			}),
		[items, settings, metadata, config]
	);
}
