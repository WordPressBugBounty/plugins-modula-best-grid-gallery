/**
 * Split custom-grid items into layout chunks (preview catalog pages vs visitor append pages).
 *
 * Settings-editor preview: page groups from previewCatalogPages so every gallery
 * item stays visible with “next page” dividers. Visitor append pagination still
 * chunks by per-page for packer gaps (not preview page dividers).
 *
 * @package
 */

import { isAppendPaginationMode } from '../store/clientLogic';
import { isSettingsEditorPreview } from './displayContext';
import { previewCatalogPagesFromGalleryState } from './previewCatalogPages';

/**
 * @param {Object[]|undefined} items
 * @return {Object[]} Gallery items.
 */
function asCatalog(items) {
	return Array.isArray(items) ? items : [];
}

/**
 * @param {Object[]} items
 * @param {number}   perPage
 * @return {Array<Object[]>} Page groups of `perPage` gallery items.
 */
function splitVisitorAppendPages(items, perPage) {
	const step = Math.max(1, perPage);
	const chunks = [];
	for (let i = 0; i < items.length; i += step) {
		chunks.push(items.slice(i, i + step));
	}
	return chunks.length ? chunks : [[]];
}

/**
 * @param {Object[]|undefined}                                                   items
 * @param {{
 *   pagination?: { enabled?: boolean, mode?: string, perPage?: number },
 *   settings?: Object,
 *   metadata?: { displayContext?: string },
 *   config?: Object,
 * }} options
 * @return {Array<Object[]>} Page groups for custom-grid packing.
 */
export function splitCustomGridDisplayChunks(items, options = {}) {
	const { pagination, settings, metadata, config } = options;

	if (isSettingsEditorPreview(metadata)) {
		return previewCatalogPagesFromGalleryState(items, {
			settings,
			metadata,
			config,
		});
	}

	const list = asCatalog(items);

	if (pagination?.enabled && isAppendPaginationMode(pagination.mode)) {
		return splitVisitorAppendPages(list, pagination.perPage || 12);
	}

	return [list];
}
