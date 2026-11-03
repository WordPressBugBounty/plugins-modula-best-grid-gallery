/**
 * Hover effect builder entitlements.
 */

/**
 * Without Compatible Pro the presets the animation catalog marks Pro are
 * locked. PHP applies the same rule to an image's own hover
 * (`Item_Fields::hover_builder_for_item`).
 *
 * @param {{ pro: boolean }}        preset       A `HOVER_BUILDER_PRESETS` entry.
 * @param {Record<string, unknown>} editorConfig
 * @return {boolean} The preset is locked on this site.
 */
export function isHoverPresetLocked(preset, editorConfig) {
	return !editorConfig?.isPro && preset.pro === true;
}
