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
export { default as ItemEditPanelHeader } from './sidebar/ItemEditPanelHeader';
export { default as ItemEditCard } from './sidebar/ItemEditCard';
export {
	default as CanvasToolbar,
	focusCanvasToolbarFirstAction,
} from './canvas/CanvasToolbar';
export { default as CanvasToolbarActionButton } from './canvas/CanvasToolbarActionButton';
export { default as AddSplit } from './canvas/AddSplit';
export { default as CanvasEmptyState } from './canvas/CanvasEmptyState';
export { default as CanvasToolbarSelectionCount } from './canvas/CanvasToolbarSelectionCount';
export { default as SelectionGrid } from './canvas/SelectionGrid';
export { default as InsertPositionSegment } from './canvas/InsertPositionSegment';
export {
	default as CanvasSortPopover,
	useCanvasSortPopover,
} from './canvas/CanvasSortPopover';
export { default as CanvasReorderDialog } from './canvas/CanvasReorderDialog';
export { useReorderDraft } from './canvas/useReorderDraft';
export {
	MediaPickerFooter,
	MediaPickerGrid,
	MediaPickerSearch,
	MediaPickerToolbar,
} from './media-picker/MediaPicker';
export { default as SelectMenuControl } from './fields/SelectMenuControl';
export { default as MotionChoicePicker } from './fields/MotionChoicePicker';
export { default as FilterNameListControl } from './fields/FilterNameListControl';
export { default as DefaultActiveFilterSelect } from './fields/DefaultActiveFilterSelect';
export { default as FilterChipsEditor } from './fields/FilterChipsEditor';
export { default as SettingSearch } from './sidebar/SettingSearch';
export {
	default as DependentRowIcon,
	DependentRowContext,
} from './sidebar/DependentRowIcon';
export { useRevealSettingRow } from './hooks/useRevealSettingRow';
export { useDebouncedValue } from './hooks/useDebouncedValue';
export { default as DesktopOnlyNotice } from './notice/DesktopOnlyNotice';
export { useTakeoverToast } from './toast/TakeoverToast';
export { useUndoToastOffer } from './toast/useUndoToastOffer';
export { default as AdminUiScope } from './appearance/AdminUiScope';
export { default as GalleryModal } from './modal/GalleryModal';
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
	isEventInOpenDialog,
	isEventInPopover,
} from './hooks/isEventInOpenDialog';
export {
	TakeoverSaveStatusProvider,
	useTakeoverSaveStatus,
} from './save-status/TakeoverSaveStatusContext';
export * from './logic';
