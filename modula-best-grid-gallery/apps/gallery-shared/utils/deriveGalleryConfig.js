/**
 * Derive gallery config from grouped settings plus runtime extras.
 *
 * @package
 */

import { settingsToConfig } from './settingsToConfig';

/**
 * @param {unknown} settings
 * @return {boolean}
 */
function hasGroupedSettings(settings) {
	return Boolean(
		settings &&
			typeof settings === 'object' &&
			Object.keys(settings).length > 0
	);
}

/**
 * @param {unknown} previewViewport
 * @return {'desktop'|'tablet'|'mobile'|undefined}
 */
function normalizePreviewViewportExtra(previewViewport) {
	if (
		previewViewport === 'desktop' ||
		previewViewport === 'tablet' ||
		previewViewport === 'mobile'
	) {
		return previewViewport;
	}
	return undefined;
}

/**
 * @param {Object|null|undefined} groupedSettings Grouped settings document.
 * @param {Object}                [extras]        Runtime extras (viewport, ids, legacy config).
 * @return {Object} Gallery config.
 */
export function deriveGalleryConfig(groupedSettings, extras = {}) {
	const previewViewport = normalizePreviewViewportExtra(
		extras.previewViewport
	);
	const galleryId = extras.galleryId || null;
	let config;

	if (hasGroupedSettings(groupedSettings)) {
		config = settingsToConfig(groupedSettings, {
			galleryId,
			legacyJsConfig: extras.legacyJsConfig || {},
			galleryComments: extras.galleryComments,
			previewViewport,
			imageSizeDimensions:
				extras.imageSizeDimensions &&
				typeof extras.imageSizeDimensions === 'object'
					? extras.imageSizeDimensions
					: undefined,
		});
		if (galleryId && !config.galleryId) {
			config.galleryId = galleryId;
		}
	} else {
		config = { ...(extras.legacyConfig || {}) };
	}

	if (extras.shareButtons && typeof extras.shareButtons === 'object') {
		try {
			config.shareButtonsJson = JSON.stringify(extras.shareButtons);
		} catch {
			// ignore malformed bootstrap share buttons
		}
	}
	if (extras.licenseCatalog && typeof extras.licenseCatalog === 'object') {
		config.licenseCatalog = extras.licenseCatalog;
	}
	if (extras.imageLicensingExtensionActive !== undefined) {
		config.imageLicensingExtensionActive =
			extras.imageLicensingExtensionActive;
	}
	if (extras.licensingGlobal && typeof extras.licensingGlobal === 'object') {
		config.licensingGlobal = extras.licensingGlobal;
	}
	if (typeof extras.hoverCustomCursorUrl === 'string') {
		config.hoverCustomCursorUrl = extras.hoverCustomCursorUrl.trim();
	}
	if (previewViewport) {
		config.previewViewport = previewViewport;
	}
	const previewHeightPx = Number(extras.previewHeightPx);
	if (Number.isFinite(previewHeightPx) && previewHeightPx > 0) {
		config.height = previewHeightPx;
		config.desktopHeight = previewHeightPx;
	}

	return config;
}

/**
 * Runtime extras for {@link deriveGalleryConfig} from visitor/preview bootstrap data.
 *
 * @param {Object|null|undefined} data      Preload data (settings, metadata, viewport).
 * @param {string|null|undefined} galleryId Normalized gallery id.
 * @return {Object} Extras bag.
 */
export function galleryConfigExtrasFromPreloadData(data, galleryId) {
	const metadata =
		data?.metadata && typeof data.metadata === 'object'
			? data.metadata
			: {};
	return {
		galleryId: galleryId || null,
		legacyJsConfig: data?.legacyJsConfig || {},
		galleryComments: metadata.galleryComments,
		previewViewport: data?.previewViewport,
		imageSizeDimensions:
			metadata.imageSizeDimensions &&
			typeof metadata.imageSizeDimensions === 'object'
				? metadata.imageSizeDimensions
				: undefined,
		shareButtons: data?.shareButtons,
		licenseCatalog: metadata.licenseCatalog,
		imageLicensingExtensionActive: metadata.imageLicensingExtensionActive,
		licensingGlobal: metadata.licensingGlobal,
		hoverCustomCursorUrl: metadata.hoverCustomCursorUrl,
		legacyConfig: data?.config,
		previewHeightPx: data?.previewHeightPx,
	};
}
