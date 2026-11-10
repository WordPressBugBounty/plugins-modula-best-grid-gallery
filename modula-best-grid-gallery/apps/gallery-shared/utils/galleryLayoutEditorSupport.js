/**
 * Gallery layouts whose editor / runtime behavior differs from standard grids.
 *
 * @package
 */

import {
	CREATIVE_ENGINE_MOSAIC,
	resolveCreativeEngineFromSettings,
} from './creativeEngine';

/** Packery-style fixed segment height (creative on Classic tiles, polaroid). */
const FIXED_HEIGHT_LAYOUT_TYPES = new Set(['creative-gallery', 'polaroid']);

/**
 * @param {string|undefined|null} type      `general.type` / `gallery.config.type`
 * @param {Object|null|undefined} [context] Grouped settings, flat config or flat settings; decides the Creative engine.
 * @return {boolean}
 */
export function isFixedHeightGalleryLayout(type, context = {}) {
	if (!type || typeof type !== 'string') {
		return false;
	}
	if (type === 'creative-gallery') {
		return !isMosaicCreativeGallery(context);
	}
	return FIXED_HEIGHT_LAYOUT_TYPES.has(type);
}

/**
 * Creative on the Mosaic engine flows rows like Justified: no fixed height.
 *
 * @param {Object|null|undefined} context Grouped settings, flat config or flat settings.
 * @return {boolean}
 */
function isMosaicCreativeGallery(context) {
	return (
		resolveCreativeEngineFromSettings(context) === CREATIVE_ENGINE_MOSAIC
	);
}

/**
 * Whether the Layout → Responsive hub (enable + mobile/tablet columns) applies.
 * Creative packery uses Heights by breakpoint instead. BnB has a fixed featured
 * grid (no column breakpoints). Polaroid uses Responsive only when Uniform size
 * is on (gated further in settingsToConfig / form-rules).
 *
 * @param {string|undefined|null} type
 * @return {boolean}
 */
export function isResponsiveSettingsSupportedForGalleryType(type) {
	if (!type || typeof type !== 'string') {
		return true;
	}
	if (
		type === 'video' ||
		type === 'creative-gallery' ||
		type === 'bnb' ||
		type === 'freeform'
	) {
		return false;
	}
	return true;
}

/**
 * Whether Infinite scroll is valid for this gallery type / polaroid mode.
 * Fixed-height packery (creative on Classic tiles, polaroid with Uniform size
 * off) cannot grow with appends; Creative on Mosaic and every other type
 * (Bento included) can. Mirrored by Shortcode::is_infinite_scroll_allowed_for_type().
 *
 * @param {string|undefined|null} type      `general.type` / config.type
 * @param {Object|null|undefined} [context] Grouped settings, flat config, or `{ polaroid: { uniformSize } }`.
 * @return {boolean}
 */
export function isInfiniteScrollSupportedForGalleryType(type, context = {}) {
	if (!type || typeof type !== 'string') {
		return true;
	}
	if (type === 'creative-gallery') {
		return isMosaicCreativeGallery(context);
	}
	if (type === 'polaroid') {
		return isPolaroidUniformSizeEnabled(context);
	}
	return true;
}

/**
 * Polaroid Uniform size defaults to on (matches settingsToConfig / schema).
 *
 * @param {Object|null|undefined} context
 * @return {boolean}
 */
function isPolaroidUniformSizeEnabled(context) {
	const polaroid =
		context && typeof context === 'object'
			? context.polaroid && typeof context.polaroid === 'object'
				? context.polaroid
				: context
			: null;
	if (!polaroid || typeof polaroid !== 'object') {
		return true;
	}
	const v = polaroid.uniformSize;
	if (v === false || v === 0 || v === '0') {
		return false;
	}
	return true;
}
