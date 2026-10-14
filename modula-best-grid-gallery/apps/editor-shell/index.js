/**
 * Shared takeover editor shell — public component interface.
 *
 * Consumed by the gallery editor (Lite) and compiled into the Albums editor
 * (Pro) through the `editor-shell` alias. Document-specific content enters
 * through component inputs; the shell never inspects the document kind.
 * Pure rules (no React) live in `editor-shell/logic`.
 */
export { default as TakeoverLayout } from './layout/TakeoverLayout';
export { default as TakeoverTopBar } from './top-bar/TakeoverTopBar';
export { default as TakeoverSidebar } from './sidebar/TakeoverSidebar';
export { default as SidebarRailNav } from './sidebar/SidebarRailNav';
export { default as SidebarRailFooter } from './sidebar/SidebarRailFooter';
export { default as SettingsPanelHeader } from './sidebar/SettingsPanelHeader';
export { default as SettingsPanelExitRow } from './sidebar/SettingsPanelExitRow';
export { default as HubDrillRow } from './sidebar/HubDrillRow';
export { default as CanvasToolbar } from './canvas/CanvasToolbar';
export { default as CanvasToolbarActionButton } from './canvas/CanvasToolbarActionButton';
export { default as AddSplit } from './canvas/AddSplit';
export { default as CanvasEmptyState } from './canvas/CanvasEmptyState';
export { default as InsertPositionSegment } from './canvas/InsertPositionSegment';
export { default as StatusBar } from './status-bar/StatusBar';
export { default as DesktopOnlyNotice } from './notice/DesktopOnlyNotice';
export { default as AppearanceToggle } from './appearance/AppearanceToggle';
export { default as SettingsEditorErrorBoundary } from './app/SettingsEditorErrorBoundary';
export { default as SettingsEditorShellFallback } from './app/SettingsEditorShellFallback';
export { getSidebarRailNavLabel } from './sidebar/sidebarRailLabels';
export {
	SettingsEditorAppearanceProvider,
	useSettingsEditorAppearance,
} from './appearance/SettingsEditorAppearanceContext';
export {
	useModalEscapeKey,
	WP_MEDIA_FRAME_BODY_CLASS,
} from './hooks/useModalEscapeKey';
export {
	TakeoverSaveStatusProvider,
	useTakeoverSaveStatus,
} from './save-status/TakeoverSaveStatusContext';
export * from './logic';
