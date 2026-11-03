/**
 * Exposes Lite settings-editor host hooks/components for Pro extension bundles.
 * Pro must call these (same module references) so React context / QueryClient match.
 */

import {
	FILTER_SELECT_ALL_VALUE,
	asGalleryItemList,
	buildFilterBarContainerClasses,
	buildFilterBarDynamicCss,
	buildFilterSelectOptions,
	buildFilteringFromSettings,
	buildPaginationDynamicCss,
	buildPaginationEdgeButtonClassName,
	buildPaginationLinkItems,
	buildPaginationNavClassName,
	buildPaginationPageButtonClassName,
	galleryRootSelector,
	isFilterBarPhoneViewport,
	normalizeFilterBarEntry,
	paginationFromGroupedSettings,
	resolveFilterBarCollapsibleActionText,
	resolveFilterBarPlacements,
	resolveFilterLayoutShellClass,
	resolveFilterPositioning,
	resolveFilterSelectValue,
	resolvePaginationNumber,
	shouldUseCollapsibleFilterBar,
	shouldUseFilterDropdown,
} from 'gallery-shared/preview';
import { useExtensionImportHost } from './ExtensionImportHostContext';
import { createTakeoverImportModal } from './createTakeoverImportModal';
import TakeoverImportDialogShell from '../components/import-dialog/TakeoverImportDialogShell';
import {
	saveMergedGalleryItems,
	galleryUploadPost,
	parseUploadAttachmentId,
	runFoldersToGalleryPipeline,
	runZipAttachmentPipeline,
} from '../api/galleryUploadApi';
import {
	previewCoreItemsToSaveMergedPayload,
	reanchorEmbeddedRowsInMergedList,
} from '../utils/embeddedGalleryItems';
import { commitPreviewCatalog } from '../utils/previewItemsCommit';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import {
	buildVideoRowsFromPlaylistSnaps,
	buildVideoTemplateRow,
	insertVideoRows,
	nextVideoTemplateId,
} from '../utils/videoTemplateItems';
import { openVideoMediaLibrary } from '../utils/openVideoMediaLibrary';
import { resolveGalleryAdminPostId } from '../utils/resolveGalleryAdminPostId';
import { buildPatchPayload } from '../logic/buildPatchPayload';
import {
	cloneGroupedSettings,
	serializeGroupedForServerRef,
} from '../form/useGallerySettingsForm';
import { normalizeGroupedDefaults } from '../logic/groupedSettingsNormalize';
import { useWatermarkPreviewSelection } from '../context/WatermarkPreviewSelectionContext';
import { useQueryClient } from '@tanstack/react-query';
import {
	AdminUiScope,
	GalleryModal,
	useTakeoverSaveStatus,
} from 'editor-shell';
import { stripRestPostMeta } from 'editor-shell/logic';
import {
	getGalleryBootstrapQueryKey,
	useGalleryBootstrapQuery,
} from '../query/useGalleryBootstrapQuery';

import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../hooks/useModulaSettingsEditorConfig';
import {
	applyGroupedFieldWrite,
	resetGroupedFieldWrite,
} from '../logic/groupedFieldWrite';

/**
 * Attach host API to `window.modula.settingsEditorHost` (idempotent).
 */
export function exposeSettingsEditorHost() {
	if (typeof window === 'undefined') {
		return;
	}

	window.modula = window.modula || {};
	window.modula.settingsEditorHost = window.modula.settingsEditorHost || {
		useModulaSettingsEditorConfig,
		useGallerySettingsFormBundle,
		useGalleryBootstrapQuery,
		applyGroupedFieldWrite,
		resetGroupedFieldWrite,
		buildPaginationDynamicCss,
		galleryRootSelector,
		paginationFromGroupedSettings,
		buildPaginationLinkItems,
		buildPaginationNavClassName,
		buildPaginationPageButtonClassName,
		buildPaginationEdgeButtonClassName,
		resolvePaginationNumber,
		useExtensionImportHost,
		createTakeoverImportModal,
		TakeoverImportDialogShell,
		saveMergedGalleryItems,
		previewCoreItemsToSaveMergedPayload,
		reanchorEmbeddedRowsInMergedList,
		commitPreviewCatalog,
		/* Pro still calls this name; it is preview catalog commit. */
		applyCoreItemsToPreviewStore: commitPreviewCatalog,
		getGalleryPreviewReduxStore,
		asGalleryItemList,
		stripEditorPageBreaks: asGalleryItemList,
		buildVideoRowsFromPlaylistSnaps,
		buildVideoTemplateRow,
		insertVideoRows,
		nextVideoTemplateId,
		openVideoMediaLibrary,
		resolveGalleryAdminPostId,
		buildPatchPayload,
		cloneGroupedSettings,
		serializeGroupedForServerRef,
		normalizeGroupedDefaults,
		stripRestPostMeta,
		useTakeoverSaveStatus,
		useWatermarkPreviewSelection,
		useQueryClient,
		getGalleryBootstrapQueryKey,
		buildFilterBarDynamicCss,
		buildFilteringFromSettings,
		resolveFilterBarPlacements,
		resolveFilterLayoutShellClass,
		resolveFilterPositioning,
		buildFilterBarContainerClasses,
		buildFilterSelectOptions,
		FILTER_SELECT_ALL_VALUE,
		normalizeFilterBarEntry,
		resolveFilterSelectValue,
		isFilterBarPhoneViewport,
		shouldUseFilterDropdown,
		shouldUseCollapsibleFilterBar,
		resolveFilterBarCollapsibleActionText,
		galleryUploadPost,
		parseUploadAttachmentId,
		runFoldersToGalleryPipeline,
		runZipAttachmentPipeline,
		/* No controls: Pro compiles its own admin-ui and takes the scope here. */
		GalleryModal,
		AdminUiScope,
	};
}
