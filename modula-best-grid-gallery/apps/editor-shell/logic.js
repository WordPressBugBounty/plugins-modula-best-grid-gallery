/**
 * Shared takeover editor shell — pure rules (no React), safe for node tests.
 */
export { createHubSectionVisibility } from './sidebar/hubSectionVisibility';
export { collectSettingHomes } from './sidebar/settingsStructureHomes';
export {
	DEVICE_ROW_LAYOUT,
	FIELD_ROW_LAYOUTS,
	fieldRowLayout,
} from './sidebar/fieldRowLayout';
export {
	countShownBlocks,
	findHeadlessDependents,
	hostRowReset,
	isDependentsSection,
	isSingleRowDependents,
} from './sidebar/settingsPanelDependents';
export {
	buildSectionKey,
	isMoreSettingsSubmenu,
} from './sidebar/settingsPanelSectionKeys';
export {
	createSettingSearch,
	matchSettings,
} from './sidebar/settingSearchIndex';
export {
	fieldDescriptionBlob,
	matchesQueryTokens,
	normalizeBlob,
	tokenizeQuery,
} from './sidebar/settingSearchText';
export { findSettingRow, settingAnchorProps } from './sidebar/settingAnchor';
export { getItemEditPager } from './sidebar/itemEditPager';
export { fieldControlId } from './fields/fieldControlId';
export {
	countFilterTags,
	filterListNames,
	formatFilterTags,
	mergeFilterTagsIntoList,
	parseFilterTags,
	stripFilterTags,
	stripOrphanFilterTags,
} from './fields/filterTags';
export {
	filterNameFromSuggestion,
	filterTokenSuggestions,
	NEW_FILTER_TOKEN_PREFIX,
} from './fields/filterTokenSuggestions';
export {
	createEditorHistory,
	EDITOR_HISTORY_MAX_PAST,
} from './history/editorHistoryStack';
export * from './top-bar/editorPostDocument';
export { buildEmbedRows, isPhpEmbedRow } from './top-bar/embedRows';
export * from './save-status/saveStatusModel';
export * from './save-status/restPostStatus';
export * from './appearance/settingsEditorAppearance';
export {
	DESKTOP_EDITOR_MIN_WIDTH_PX,
	DESKTOP_EDITOR_MEDIA_QUERY,
} from './notice/desktopEditorViewport';
