/**
 * Gallery layouts whose editor / runtime behavior differs from standard grids.
 *
 * @package
 */

/** Packery-style fixed segment height (creative, polaroid). */
const FIXED_HEIGHT_LAYOUT_TYPES = new Set(['creative-gallery', 'polaroid']);

/**
 * @param {string|undefined|null} type `general.type` / `gallery.config.type`
 * @return {boolean}
 */
export function isFixedHeightGalleryLayout(type) {
	if (!type || typeof type !== 'string') {
		return false;
	}
	return FIXED_HEIGHT_LAYOUT_TYPES.has(type);
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
	if (type === 'video' || type === 'creative-gallery' || type === 'bnb') {
		return false;
	}
	return true;
}

/**
 * Whether Infinite scroll is valid for this gallery type / polaroid mode.
 * Fixed-height packery (creative, polaroid with Uniform size off) cannot grow with appends.
 *
 * @param {string|undefined|null} type    `general.type` / config.type
 * @param {Object|null|undefined} [context] Grouped settings, flat config, or `{ polaroid: { uniformSize } }`.
 * @return {boolean}
 */
export function isInfiniteScrollSupportedForGalleryType(type, context = {}) {
	if (!type || typeof type !== 'string') {
		return true;
	}
	if (type === 'creative-gallery') {
		return false;
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
