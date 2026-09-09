/**
 * Gallery display context helpers (preview vs visitor frontend).
 *
 * @package
 */

export const SETTINGS_EDITOR_PREVIEW = 'settings-editor-preview';

/**
 * @param {{ displayContext?: string }|null|undefined} metadata
 * @returns {boolean}
 */
export function isSettingsEditorPreview(metadata) {
	return metadata?.displayContext === SETTINGS_EDITOR_PREVIEW;
}

/**
 * @param {{ displayContext?: string }|null|undefined} metadata
 * @returns {boolean}
 */
export function shouldHideVisitorChrome(metadata) {
	return isSettingsEditorPreview(metadata);
}

/**
 * @param {{ displayContext?: string, staticStoryLayout?: boolean }|null|undefined} metadata
 * @returns {boolean}
 */
export function isStaticStoryPreview(metadata) {
	return (
		isSettingsEditorPreview(metadata) &&
		metadata?.staticStoryLayout === true
	);
}
