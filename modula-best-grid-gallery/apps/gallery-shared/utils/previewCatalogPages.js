/**
 * Page groups for the settings-editor preview catalog.
 *
 * Visitor gallery and skipped layout types are always one chunk.
 * Preview page dividers are computed at render from pagination step, not fake rows.
 *
 * @package
 */

import { isSettingsEditorPreview } from './displayContext';
import { editorPreviewPageBreakStep } from './paginationFromSettings';
import { getForcedPreviewViewport } from './resolvePreviewViewport';

const PREVIEW_PAGE_DIVIDER_SKIP_LAYOUTS = new Set([
	'slider',
	'story',
	'bnb',
	'parallax-masonry',
	'template',
]);

/**
 * @param {unknown} items Preview catalog or visitor item list.
 * @return {Object[]} Gallery items.
 */
function asCatalog(items) {
	return Array.isArray(items) ? items : [];
}

/**
 * @param {Object[]} items
 * @return {Object[][]} A single page group.
 */
function oneChunk(items) {
	return items.length ? [items] : [[]];
}

/**
 * @param {Object[]} items
 * @param {number}   step
 * @return {Object[][]} Page groups of `step` gallery items.
 */
function chunkByStep(items, step) {
	if (items.length === 0) {
		return [[]];
	}
	const chunks = [];
	for (let i = 0; i < items.length; i += step) {
		chunks.push(items.slice(i, i + step));
	}
	return chunks;
}

/**
 * @param {unknown}                     items                     Preview catalog (gallery items).
 * @param {Object}                      [options]
 * @param {Object}                      [options.settings]
 * @param {{ displayContext?: string }} [options.metadata]
 * @param {string}                      [options.layoutType]
 * @param {'desktop'|'tablet'|'mobile'} [options.previewViewport]
 * @return {Object[][]} Page groups for preview page dividers.
 */
export function previewCatalogPages(items, options = {}) {
	const catalog = asCatalog(items);
	const { settings, metadata, previewViewport } = options;

	if (!isSettingsEditorPreview(metadata)) {
		return oneChunk(catalog);
	}

	if (PREVIEW_PAGE_DIVIDER_SKIP_LAYOUTS.has(options.layoutType)) {
		return oneChunk(catalog);
	}

	const step = editorPreviewPageBreakStep(
		settings || {},
		previewViewport ? { previewViewport } : {}
	);
	if (step === null) {
		return oneChunk(catalog);
	}

	return chunkByStep(catalog, step);
}

/**
 * @param {unknown}                     items              Preview catalog (gallery items).
 * @param {Object}                      [gallery]          Gallery slice fields used to derive chunks.
 * @param {Object}                      [gallery.settings] Grouped v2 settings.
 * @param {{ displayContext?: string }} [gallery.metadata] Display context metadata.
 * @param {Object}                      [gallery.config]   Flat gallery config (type + preview viewport).
 * @return {Object[][]} Page groups for preview page dividers.
 */
export function previewCatalogPagesFromGalleryState(items, gallery = {}) {
	const { settings, metadata, config } = gallery;
	return previewCatalogPages(items, {
		settings,
		metadata,
		layoutType: config?.type,
		previewViewport: getForcedPreviewViewport(config) || undefined,
	});
}
