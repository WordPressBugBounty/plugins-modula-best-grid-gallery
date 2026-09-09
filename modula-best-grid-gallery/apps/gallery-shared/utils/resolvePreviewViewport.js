/**
 * Responsive column/gutter/device resolution for gallery runtime.
 * Settings-editor preview forces `config.previewViewport`; frontend uses layout-specific window breakpoints.
 *
 * @package
 */

import { isSettingsEditorPreview } from './displayContext';

/** @typedef {'desktop'|'tablet'|'mobile'} PreviewViewport */
/** @typedef {'mobile'|'tablet'|'desktop'} ResponsiveDevice */

/** Default masonry/phone max width (px). Overridden by `config.treatAsPhoneUnder`. */
export const MASONRY_MOBILE_MAX_PX = 600;
/** Default masonry/tablet max width (px). Overridden by `config.treatAsTabletUnder`. */
export const MASONRY_TABLET_MAX_PX = 1024;

export const MASONRY_MOBILE_MQ = `(max-width: ${MASONRY_MOBILE_MAX_PX}px)`;
export const MASONRY_TABLET_MQ = `(max-width: ${MASONRY_TABLET_MAX_PX}px)`;

/** Legacy custom grid (jquery-modula createCustomGallery). */
export const CUSTOM_GRID_MOBILE_MAX_PX = 568;
export const CUSTOM_GRID_TABLET_MAX_PX = 768;

/**
 * @param {Object|null|undefined} config
 * @return {number}
 */
export function resolveTreatAsPhoneUnderPx(config) {
	const n = parseInt(config?.treatAsPhoneUnder ?? MASONRY_MOBILE_MAX_PX, 10);
	return Number.isFinite(n) && n > 0 ? n : MASONRY_MOBILE_MAX_PX;
}

/**
 * @param {Object|null|undefined} config
 * @return {number}
 */
export function resolveTreatAsTabletUnderPx(config) {
	const n = parseInt(config?.treatAsTabletUnder ?? MASONRY_TABLET_MAX_PX, 10);
	return Number.isFinite(n) && n > 0 ? n : MASONRY_TABLET_MAX_PX;
}

/**
 * @param {Object|null|undefined} config
 * @return {string}
 */
export function getMasonryMobileMq(config) {
	return `(max-width: ${resolveTreatAsPhoneUnderPx(config)}px)`;
}

/**
 * @param {Object|null|undefined} config
 * @return {string}
 */
export function getMasonryTabletMq(config) {
	return `(max-width: ${resolveTreatAsTabletUnderPx(config)}px)`;
}

/**
 * @param {unknown} value
 * @return {boolean}
 */
export function isTruthyResponsiveFlag(value) {
	return value === true || value === 1 || value === '1';
}

/**
 * @param {Object|null|undefined} config
 * @return {PreviewViewport|null}
 */
export function getForcedPreviewViewport(config) {
	const v = config?.previewViewport;
	if (v === 'desktop' || v === 'tablet' || v === 'mobile') {
		return v;
	}
	return null;
}

/**
 * @param {PreviewViewport} previewViewport
 * @return {ResponsiveDevice}
 */
function previewViewportToDevice(previewViewport) {
	if (previewViewport === 'mobile') {
		return 'mobile';
	}
	if (previewViewport === 'tablet') {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * @return {ResponsiveDevice}
 */
export function resolveDeviceFromWindowCustomGrid() {
	if (typeof window === 'undefined') {
		return 'desktop';
	}
	const w = document.documentElement.clientWidth;
	if (w <= CUSTOM_GRID_MOBILE_MAX_PX) {
		return 'mobile';
	}
	if (w <= CUSTOM_GRID_TABLET_MAX_PX) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * @param {Object|null|undefined} [config]
 * @return {ResponsiveDevice}
 */
export function resolveDeviceFromWindowMasonry(config) {
	if (typeof window === 'undefined') {
		return 'desktop';
	}
	try {
		if (window.matchMedia(getMasonryMobileMq(config)).matches) {
			return 'mobile';
		}
		if (window.matchMedia(getMasonryTabletMq(config)).matches) {
			return 'tablet';
		}
	} catch {
		// ignore
	}
	return 'desktop';
}

/**
 * @param {Object|null|undefined} config
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax' }} [opts]
 * @return {ResponsiveDevice}
 */
export function resolveResponsiveDevice(config, opts = {}) {
	const forced = getForcedPreviewViewport(config);
	if (forced) {
		return previewViewportToDevice(forced);
	}
	const layout = opts.layout ?? 'masonry';
	if (layout === 'custom-grid' || layout === 'parallax') {
		return resolveDeviceFromWindowCustomGrid();
	}
	return resolveDeviceFromWindowMasonry(config);
}

/**
 * Device from a measured width (gallery container or window), not previewViewport.
 *
 * @param {number} widthPx
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax', config?: Object|null }} [opts]
 * @return {ResponsiveDevice}
 */
export function resolveResponsiveDeviceFromWidth(widthPx, opts = {}) {
	const layout = opts.layout ?? 'masonry';
	const w = Math.max(0, Number(widthPx) || 0);
	if (layout === 'custom-grid' || layout === 'parallax') {
		if (w <= CUSTOM_GRID_MOBILE_MAX_PX) {
			return 'mobile';
		}
		if (w <= CUSTOM_GRID_TABLET_MAX_PX) {
			return 'tablet';
		}
		return 'desktop';
	}
	const phoneUnder = resolveTreatAsPhoneUnderPx(opts.config);
	const tabletUnder = resolveTreatAsTabletUnderPx(opts.config);
	if (w <= phoneUnder) {
		return 'mobile';
	}
	if (w <= tabletUnder) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * Column count for a measured gallery width (container-aware responsive).
 *
 * @param {Object|null|undefined} config
 * @param {number} widthPx
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax' }} [opts]
 * @return {number}
 */
export function resolveResponsiveColumnsForWidth(config, widthPx, opts = {}) {
	const forced = getForcedPreviewViewport(config);
	if (forced === 'mobile') {
		return parseInt(config?.mobileColumns ?? 1, 10) || 1;
	}
	if (forced === 'tablet') {
		return parseInt(config?.tabletColumns ?? 2, 10) || 2;
	}
	const desktop = parseInt(config?.columns ?? 3, 10) || 3;
	if (!isTruthyResponsiveFlag(config?.enableResponsive)) {
		return desktop;
	}
	const device = resolveResponsiveDeviceFromWidth(widthPx, {
		...opts,
		config,
	});
	if (device === 'mobile') {
		return parseInt(config?.mobileColumns ?? 1, 10) || 1;
	}
	if (device === 'tablet') {
		return parseInt(config?.tabletColumns ?? 2, 10) || 2;
	}
	return desktop;
}

/**
 * Gutter for a measured gallery width.
 *
 * @param {Object|null|undefined} config
 * @param {number} widthPx
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax' }} [opts]
 * @return {number}
 */
export function resolveResponsiveGutterForWidth(config, widthPx, opts = {}) {
	const desktop = Number(config?.gutter ?? config?.desktopGutter ?? 10);
	const desktopFinite = Number.isFinite(desktop) ? desktop : 10;
	const forced = getForcedPreviewViewport(config);
	if (forced === 'mobile') {
		const m = Number(config.mobileGutter);
		return Number.isFinite(m) ? m : desktopFinite;
	}
	if (forced === 'tablet') {
		const t = Number(config.tabletGutter);
		return Number.isFinite(t) ? t : desktopFinite;
	}
	if (!isTruthyResponsiveFlag(config?.enableResponsive)) {
		return desktopFinite;
	}
	const device = resolveResponsiveDeviceFromWidth(widthPx, {
		...opts,
		config,
	});
	if (device === 'mobile') {
		const m = Number(config.mobileGutter);
		return Number.isFinite(m) ? m : desktopFinite;
	}
	if (device === 'tablet') {
		const t = Number(config.tabletGutter);
		return Number.isFinite(t) ? t : desktopFinite;
	}
	return desktopFinite;
}

/**
 * @param {Object|null|undefined} config
 * @param {{ layout?: 'masonry'|'custom-grid'|'parallax' }} [opts]
 * @return {number}
 */
export function resolveResponsiveColumns(config, opts = {}) {
	const desktop = parseInt(config?.columns ?? 3, 10) || 3;
	const forced = getForcedPreviewViewport(config);
	if (forced === 'mobile') {
		return parseInt(config?.mobileColumns ?? 1, 10) || 1;
	}
	if (forced === 'tablet') {
		return parseInt(config?.tabletColumns ?? 2, 10) || 2;
	}
	if (!isTruthyResponsiveFlag(config?.enableResponsive)) {
		return desktop;
	}
	const device = resolveResponsiveDevice(config, opts);
	if (device === 'mobile') {
		return parseInt(config?.mobileColumns ?? 1, 10) || 1;
	}
	if (device === 'tablet') {
		return parseInt(config?.tabletColumns ?? 2, 10) || 2;
	}
	return desktop;
}

/**
 * Creative / packer segment height for the active preview viewport or responsive device.
 *
 * @param {Object|null|undefined} config
 * @return {number}
 */
export function resolveResponsiveGalleryHeight(config) {
	const fallback = 800;
	const desktop = Number(config?.desktopHeight ?? config?.height ?? fallback);
	const tablet = Number(config?.tabletHeight ?? desktop);
	const mobile = Number(config?.mobileHeight ?? tablet);
	const pick = (value) =>
		Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;

	// Heights by breakpoint is the control itself (creative / polaroid packery) —
	// do not gate on responsive.enableResponsive.
	const forced = getForcedPreviewViewport(config);
	if (forced === 'mobile') {
		return pick(mobile);
	}
	if (forced === 'tablet') {
		return pick(tablet);
	}
	const device = resolveResponsiveDevice(config);
	if (device === 'mobile') {
		return pick(mobile);
	}
	if (device === 'tablet') {
		return pick(tablet);
	}
	return pick(desktop);
}

/**
 * Polaroid uniform-size column count for the active viewport.
 * Desktop uses `uniformColumns` (0 = auto). Tablet/mobile use responsive columns
 * when Responsive is on, or when the settings-editor forces a preview viewport.
 *
 * @param {Object|null|undefined} config
 * @param {number}                uniformColumns Polaroid “Uniform columns” (0–12).
 * @return {number} Column count for {@link generateUniformPortraitPolaroidTiles} (0 = auto).
 */
export function resolvePolaroidUniformColumns(config, uniformColumns) {
	const desktop = Math.min(
		12,
		Math.max(0, parseInt(uniformColumns, 10) || 0)
	);
	const forced = getForcedPreviewViewport(config);
	if (forced === 'mobile') {
		return parseInt(config?.mobileColumns ?? 1, 10) || 1;
	}
	if (forced === 'tablet') {
		return parseInt(config?.tabletColumns ?? 2, 10) || 2;
	}
	if (!isTruthyResponsiveFlag(config?.enableResponsive)) {
		return desktop;
	}
	const device = resolveResponsiveDevice(config);
	if (device === 'mobile') {
		return parseInt(config?.mobileColumns ?? 1, 10) || 1;
	}
	if (device === 'tablet') {
		return parseInt(config?.tabletColumns ?? 2, 10) || 2;
	}
	return desktop;
}

export function resolveResponsiveGutterValue(config, opts = {}) {
	const desktop = Number(config?.gutter ?? config?.desktopGutter ?? 10);
	const desktopFinite = Number.isFinite(desktop) ? desktop : 10;
	const forced = getForcedPreviewViewport(config);
	if (forced === 'mobile') {
		const m = Number(config.mobileGutter);
		return Number.isFinite(m) ? m : desktopFinite;
	}
	if (forced === 'tablet') {
		const t = Number(config.tabletGutter);
		return Number.isFinite(t) ? t : desktopFinite;
	}
	if (!isTruthyResponsiveFlag(config?.enableResponsive)) {
		return desktopFinite;
	}
	const device = resolveResponsiveDevice(config, opts);
	if (device === 'mobile') {
		const m = Number(config.mobileGutter);
		return Number.isFinite(m) ? m : desktopFinite;
	}
	if (device === 'tablet') {
		const t = Number(config.tabletGutter);
		return Number.isFinite(t) ? t : desktopFinite;
	}
	return desktopFinite;
}

/**
 * Custom grid on tablet/mobile: N-column flow (masonry) instead of desktop grid pack / RGL.
 * Settings-editor preview follows preview viewport only; visitor still uses measured width.
 *
 * @param {Object|null|undefined} config
 * @param {{ displayContext?: string }} [metadata]
 * @param {number} [containerWidth] Measured gallery width (px); falls back to window.
 * @return {boolean} True when Custom grid should mount column-flow instead of the packed grid.
 */
export function shouldCustomGridUseColumnFlow(
	config,
	metadata,
	containerWidth = 0
) {
	if (config?.type !== 'custom-grid') {
		return false;
	}
	const forced = getForcedPreviewViewport(config);
	if (forced === 'tablet' || forced === 'mobile') {
		return true;
	}
	if (isSettingsEditorPreview(metadata)) {
		return false;
	}
	if (!isTruthyResponsiveFlag(config?.enableResponsive)) {
		return false;
	}
	const measureWidth =
		containerWidth > 0
			? containerWidth
			: typeof document !== 'undefined'
				? document.documentElement.clientWidth
				: 9999;
	const device = resolveResponsiveDeviceFromWidth(measureWidth, {
		layout: 'custom-grid',
	});
	return device === 'tablet' || device === 'mobile';
}

/**
 * Custom-grid RGL editing is allowed only on desktop takeover preview.
 *
 * @param {Object|null|undefined} config
 * @param {{ displayContext?: string }} [metadata]
 * @return {boolean}
 */
export function isCustomGridPreviewLayoutEditable(config, metadata) {
	if (!isSettingsEditorPreview(metadata)) {
		return false;
	}
	if (config?.type !== 'custom-grid') {
		return false;
	}
	const forced = getForcedPreviewViewport(config);
	// Missing previewViewport on config ⇒ treat as desktop (drag/resize enabled).
	if (!forced) {
		return true;
	}
	return forced === 'desktop';
}
