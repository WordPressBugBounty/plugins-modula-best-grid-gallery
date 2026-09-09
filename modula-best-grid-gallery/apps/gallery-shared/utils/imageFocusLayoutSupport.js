/** Gallery types that do not use per-tile image focus in the settings-editor preview. */
const IMAGE_FOCUS_UNSUPPORTED_TYPES = new Set(['grid', 'video', 'fit-grid']);

/**
 * Whether the settings-editor preview should offer “Image focus” for this gallery layout type.
 * Masonry grid (`grid`) uses variable tile shapes; video galleries use playlist posters, not focal crop tiles.
 * Fit grid always shows the full image — alignment is layout-driven, not focal crop.
 *
 * @param {string|undefined|null} type - `gallery.config.type` / `general.type`
 * @return {boolean}
 */
export function isImageFocusSupportedForGalleryType(type) {
	if (!type || typeof type !== 'string') {
		return true;
	}
	if (IMAGE_FOCUS_UNSUPPORTED_TYPES.has(type)) {
		return false;
	}
	return true;
}

/**
 * @param {Object|null|undefined} config Gallery flat config from Redux / settingsToConfig.
 * @return {boolean}
 */
export function isImageFocusSupportedForGalleryConfig(config) {
	return isImageFocusSupportedForGalleryType(config?.type);
}
