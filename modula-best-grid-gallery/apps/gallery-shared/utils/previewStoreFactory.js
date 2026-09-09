/**
 * Preview store factory — create and update the settings-editor preview store.
 *
 * @package
 */

import { SETTINGS_EDITOR_PREVIEW } from './displayContext';
import { buildPreloadedState } from './preloadState';
import { markCustomGridRepackAfterGalleryTypeChange } from './repackCustomGridPreviewItems';
import { refreshPreviewCatalogPaginationTotals } from './commitPreviewCatalog';
import { createGalleryStore } from '../store';
import { setGallery } from '../store/slices/gallerySlice';
import { setFiltering } from '../store/slices/filteringSlice';
import { galleryConfigExtrasFromPreloadData } from './deriveGalleryConfig';

/**
 * @param {unknown}                     heightRaw General height setting.
 * @param {'desktop'|'tablet'|'mobile'} viewport  Preview viewport.
 * @return {number} Min-height in pixels.
 */
function previewGalleryHeightPx(heightRaw, viewport) {
	const fallback = 800;
	const arr = Array.isArray(heightRaw)
		? heightRaw
		: [fallback, fallback, fallback];
	let idx = 0;
	if (viewport === 'mobile') {
		idx = 2;
	} else if (viewport === 'tablet') {
		idx = 1;
	}
	const n = parseInt(arr[idx] ?? arr[0] ?? fallback, 10);
	return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Clone bootstrap rows so the preview store does not share refs with React Query.
 *
 * @param {unknown} items Raw bootstrap item rows.
 * @return {unknown} Cloned rows, or the original non-array value.
 */
function clonePreviewCatalogItems(items) {
	if (!Array.isArray(items)) {
		return items;
	}
	return items.map((row) => {
		if (!row || typeof row !== 'object') {
			return row;
		}
		const next = { ...row };
		if (
			next.itemKind === 'content_block' ||
			next.itemKind === 'shortcode'
		) {
			const eid = next.embeddedId ?? next.id;
			if (eid !== undefined && eid !== null && String(eid) !== '') {
				const s = String(eid);
				next.embeddedId = next.embeddedId ?? s;
				next.id =
					next.id !== undefined &&
					next.id !== null &&
					String(next.id) !== ''
						? next.id
						: s;
			}
		}
		if (next.imgAttributes && typeof next.imgAttributes === 'object') {
			next.imgAttributes = { ...next.imgAttributes };
		}
		if (next.img_attributes && typeof next.img_attributes === 'object') {
			next.img_attributes = { ...next.img_attributes };
		}
		return next;
	});
}

/**
 * @param {'desktop'|'tablet'|'mobile'|unknown} viewport Requested preview viewport.
 * @return {'desktop'|'tablet'|'mobile'} Normalized preview viewport.
 */
function normalizePreviewViewport(viewport) {
	if (viewport === 'tablet' || viewport === 'mobile') {
		return viewport;
	}
	return 'desktop';
}

/**
 * @param {{
 *   bootstrap?: Object,
 *   groupedSettings?: Object,
 *   previewViewport?: 'desktop'|'tablet'|'mobile',
 *   galleryTitle?: string,
 *   items?: unknown,
 *   metadata?: Object,
 * }} args Factory inputs.
 * @return {Object} Preloaded Redux state.
 */
function buildPreviewStorePreloadedState(args) {
	const groupedSettings =
		args.groupedSettings && typeof args.groupedSettings === 'object'
			? args.groupedSettings
			: {};
	const bootstrap =
		args.bootstrap && typeof args.bootstrap === 'object'
			? args.bootstrap
			: {};
	const previewViewport = normalizePreviewViewport(args.previewViewport);
	const galleryType =
		typeof groupedSettings.general?.type === 'string'
			? groupedSettings.general.type
			: '';
	const galleryTitle =
		typeof args.galleryTitle === 'string' ? args.galleryTitle.trim() : '';
	let baseMetadata = {};
	if (args.metadata && typeof args.metadata === 'object') {
		baseMetadata = args.metadata;
	} else if (bootstrap.metadata && typeof bootstrap.metadata === 'object') {
		baseMetadata = bootstrap.metadata;
	}
	let items = args.items;
	if (items === undefined) {
		items = Array.isArray(bootstrap.items)
			? clonePreviewCatalogItems(bootstrap.items)
			: bootstrap.items;
	}

	const previewH = previewGalleryHeightPx(
		groupedSettings?.general?.height,
		previewViewport
	);
	const merged = {
		...bootstrap,
		settings: groupedSettings,
		metadata: {
			...baseMetadata,
			...(galleryTitle !== '' ? { galleryTitle } : {}),
			displayContext: SETTINGS_EDITOR_PREVIEW,
		},
		items,
		previewViewport,
		previewHeightPx: previewH,
	};
	if (
		galleryType === 'story' ||
		bootstrap?.metadata?.staticStoryLayout === true
	) {
		merged.metadata.staticStoryLayout = true;
	} else {
		delete merged.metadata.staticStoryLayout;
	}

	return buildPreloadedState(merged, null);
}

/**
 * Create the settings-editor preview store.
 * Callers pass grouped settings already normalized by the gallery editor.
 *
 * @param {{
 *   bootstrap: Object,
 *   groupedSettings: Object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   galleryTitle?: string,
 * }} args Bootstrap payload and grouped settings.
 * @return {import('@reduxjs/toolkit').Store} Preview Redux store.
 */
export function createPreviewStore(args) {
	return createGalleryStore(buildPreviewStorePreloadedState(args || {}));
}

/**
 * Update grouped settings and viewport on an existing preview store.
 * Does not replace the preview catalog.
 *
 * @param {import('@reduxjs/toolkit').Store}              store Preview store.
 * @param {{
 *   groupedSettings: Object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   galleryTitle?: string,
 * }} args Grouped settings and viewport.
 * @return {void} Nothing.
 */
export function updatePreviewStore(store, args) {
	if (!store || !args) {
		return;
	}
	const current = store.getState();
	const previewViewport = normalizePreviewViewport(args.previewViewport);
	const preloaded = buildPreviewStorePreloadedState({
		bootstrap: {},
		groupedSettings: args.groupedSettings,
		previewViewport,
		galleryTitle: args.galleryTitle,
		items: current?.items?.items ?? [],
		metadata: current?.gallery?.metadata || {},
	});
	markCustomGridRepackAfterGalleryTypeChange(
		current?.gallery?.config?.type,
		preloaded.gallery?.config?.type,
		current?.items?.items
	);
	store.dispatch(
		setGallery({
			settings: preloaded.gallery.settings,
			metadata: preloaded.gallery.metadata,
			galleryId: preloaded.gallery.galleryId,
			extras: galleryConfigExtrasFromPreloadData(
				{
					metadata: preloaded.gallery.metadata,
					previewViewport,
					previewHeightPx: previewGalleryHeightPx(
						args.groupedSettings?.general?.height,
						previewViewport
					),
				},
				preloaded.gallery.galleryId
			),
		})
	);
	if (preloaded.filtering) {
		store.dispatch(setFiltering(preloaded.filtering));
	}
	refreshPreviewCatalogPaginationTotals(store);
}
