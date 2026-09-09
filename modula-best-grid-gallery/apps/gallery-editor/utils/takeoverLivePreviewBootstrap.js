/**
 * Bootstrap helpers for the takeover live preview Redux store (dimensions + item cloning).
 *
 * @package
 */
import {
	asGalleryItemList,
	commitPreviewCatalog,
	createPreviewStore,
	getLayoutPolicy,
	isEmbeddedGalleryItemRow,
	resolveGalleryWidthCss,
	updatePreviewStore,
} from 'gallery-shared/preview';
import { mergeBootstrapItemsPreservingEmbedded } from './previewItemsCommit';
import { cloneGroupedSettings } from '../form/useGallerySettingsForm';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';

/**
 * @param {Object} groupedSettings Grouped v2 settings.
 * @return {Object} Cloned settings after editor normalize.
 */
function normalizePreviewGroupedSettings(groupedSettings) {
	const normalizedGrouped = cloneGroupedSettings(groupedSettings || {});
	normalizeGroupedDefaults(normalizedGrouped);
	return normalizedGrouped;
}

/**
 * Refresh Redux pagination totals after pagination settings or viewport change.
 * The preview catalog stays gallery items only; layouts paint dividers at render.
 *
 * @param {import('@reduxjs/toolkit').Store} store Gallery Redux store.
 * @return {void} Nothing.
 */
export function refreshPreviewCatalogPagination(store) {
	if (!store) {
		return;
	}
	const core = asGalleryItemList(store.getState()?.items?.items ?? []);
	commitPreviewCatalog(store, core);
}

/**
 * @param {unknown[]} [items] Preview catalog rows.
 * @return {number} Count of embedded gallery items.
 */
function countEmbeddedGalleryItems(items) {
	if (!Array.isArray(items)) {
		return 0;
	}
	return items.filter((row) => isEmbeddedGalleryItemRow(row)).length;
}

/**
 * CSS width for #modula-{id} from grouped general.width (v2 string or number).
 *
 * @param {unknown} raw
 * @param {unknown} [galleryType] general.type — masonry (`grid`) clamps % over 100.
 * @return {string} CSS width value, or 100% when unset or unsafe.
 */
export function previewGalleryWidthCss(raw, galleryType) {
	return resolveGalleryWidthCss(
		getLayoutPolicy({ general: { type: galleryType } }).clampWidth(raw),
		{
			fallback: '100%',
		}
	);
}

/**
 * Responsive gallery min-height (creative / uniform fixed) for editor preview segments.
 *
 * @param {unknown}                     heightRaw general.height
 * @param {'desktop'|'tablet'|'mobile'} viewport
 * @return {number} Min-height in pixels for the preview shell.
 */
export function previewGalleryHeightPx(heightRaw, viewport) {
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
 * Avoid sharing object refs between React Query cache and Redux preloaded items
 * (buildPreloadedState only shallow-copies the items array).
 *
 * @param {unknown[]} items Raw bootstrap item rows.
 * @return {unknown[]} Shallow-cloned rows with cloned img attribute objects.
 */
export function cloneBootstrapItemsForPreviewStore(items) {
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
 * Build preloaded Redux state for the takeover live preview (same shape as createGalleryStore).
 *
 * @param {{ bootstrap: object, groupedSettings: object, previewViewport: 'desktop'|'tablet'|'mobile', galleryTitle?: string }} args
 * @return {Object} Preloaded state object
 */
export function buildTakeoverLivePreviewPreloadedState(args) {
	return createTakeoverLivePreviewReduxStore(args).getState();
}

/**
 * Update only preview viewport + responsive height on an existing store (items unchanged).
 *
 * @param {import('@reduxjs/toolkit').Store} store
 * @param {Object}                           groupedSettings
 * @param {'desktop'|'tablet'|'mobile'}      previewViewport
 */
export function applyPreviewViewportToGalleryStore(
	store,
	groupedSettings,
	previewViewport
) {
	if (!store) {
		return;
	}
	updatePreviewStore(store, {
		groupedSettings: normalizePreviewGroupedSettings(groupedSettings),
		previewViewport,
	});
}

/**
 * Push latest bootstrap + form settings into an existing preview store without recreating it.
 * Keeps the same store instance when React Query refetches bootstrap so react-grid-layout does not remount.
 *
 * @param {import('@reduxjs/toolkit').Store}              store Preview store.
 * @param {{
 *   bootstrap: Object,
 *   groupedSettings: Object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   galleryTitle?: string,
 *   preserveItems?: boolean,
 * }} args Bootstrap payload, settings, and preserve flag.
 * @return {void} Nothing.
 */
export function hydrateTakeoverLivePreviewStore(store, args) {
	if (!store || !args) {
		return;
	}
	const groupedSettings = normalizePreviewGroupedSettings(
		args.groupedSettings
	);
	updatePreviewStore(store, {
		groupedSettings,
		previewViewport: args.previewViewport,
		galleryTitle: args.galleryTitle,
	});

	const incoming = cloneBootstrapItemsForPreviewStore(
		Array.isArray(args.bootstrap?.items) ? args.bootstrap.items : []
	);
	const incomingEmbedded = countEmbeddedGalleryItems(incoming);
	const currentEmbedded = countEmbeddedGalleryItems(
		store.getState()?.items?.items
	);
	const wouldDropEmbedded = currentEmbedded > 0 && incomingEmbedded === 0;
	const preserveItems = Boolean(args.preserveItems) || wouldDropEmbedded;
	if (preserveItems) {
		return;
	}
	const mergedItems = mergeBootstrapItemsPreservingEmbedded(
		asGalleryItemList(store.getState()?.items?.items ?? []),
		asGalleryItemList(incoming)
	);
	commitPreviewCatalog(store, mergedItems);
}

/**
 * Build the Redux store used by the takeover live preview.
 *
 * @param {{ bootstrap: object, groupedSettings: object, previewViewport: 'desktop'|'tablet'|'mobile', galleryTitle?: string }} args
 * @return {*} Configured gallery preview store.
 */
export function createTakeoverLivePreviewReduxStore(args) {
	return createPreviewStore({
		bootstrap: args?.bootstrap,
		groupedSettings: normalizePreviewGroupedSettings(args?.groupedSettings),
		previewViewport: args?.previewViewport,
		galleryTitle: args?.galleryTitle,
	});
}
