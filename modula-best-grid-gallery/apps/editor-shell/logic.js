/**
 * Shared takeover editor shell — pure rules (no React), safe for node tests.
 */
export { createHubSectionVisibility } from './sidebar/hubSectionVisibility';
export * from './top-bar/editorPostDocument';
export * from './save-status/saveStatusModel';
export * from './save-status/restPostStatus';
export * from './appearance/settingsEditorAppearance';
export {
	DESKTOP_EDITOR_MIN_WIDTH_PX,
	DESKTOP_EDITOR_MEDIA_QUERY,
} from './notice/desktopEditorViewport';
