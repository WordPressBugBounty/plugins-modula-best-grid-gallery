/**
 * Hover effect builder entitlements from PHP bootstrap config.
 */
import { getModulaSettingsEditorConfig } from '../config/modulaSettingsEditorConfig';

/**
 * @param {Record<string, unknown>} [editorConfig]
 * @returns {{ freePresetCount: number, customizeTabEnabled: boolean }}
 */
export function getHoverBuilderEntitlements(editorConfig) {
	const editor = editorConfig || getModulaSettingsEditorConfig();
	const entitlements =
		editor.hoverBuilderEntitlements &&
		typeof editor.hoverBuilderEntitlements === 'object'
			? editor.hoverBuilderEntitlements
			: {};
	const freePresetCount = Number(entitlements.freePresetCount);
	return {
		freePresetCount:
			Number.isFinite(freePresetCount) && freePresetCount >= 0
				? freePresetCount
				: 5,
		customizeTabEnabled: Boolean(entitlements.customizeTabEnabled),
	};
}
