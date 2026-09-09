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
	buildPaginationLinkItems,
	galleryRootSelector,
	isFilterBarPhoneViewport,
	normalizeFilterBarEntry,
	paginationFromGroupedSettings,
	resolveFilterBarCollapsibleActionText,
	resolveFilterBarDefaultActiveKey,
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
import { stripRestPostMeta } from '../utils/applyRestPostStatus';
import { useTakeoverSaveStatus } from '../context/TakeoverSaveStatusContext';
import { useWatermarkPreviewSelection } from '../context/WatermarkPreviewSelectionContext';
import { useQueryClient } from '@tanstack/react-query';
import {
	getGalleryBootstrapQueryKey,
	useGalleryBootstrapQuery,
} from '../query/useGalleryBootstrapQuery';

import GalleryModal from '../components/gallery-modal/GalleryModal';
import AppearanceToggle from '../components/shell/AppearanceToggle';
import GalleryTakeoverTopBar from '../components/shell/GalleryTakeoverTopBar';
import SidebarRailFooter from '../components/sidebar/SidebarRailFooter';
import SchemaCollapsibleFieldGroup from '../components/schema/SchemaCollapsibleFieldGroup';
import SchemaCompositeRow from '../components/schema/SchemaCompositeRow';
import SchemaFieldRow from '../components/schema/SchemaFieldRow';
import SettingsEditorErrorBoundary from '../components/shell/SettingsEditorErrorBoundary';
import TakeoverSettingsAutosave from '../components/shell/TakeoverSettingsAutosave';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { useModulaSettingsEditorConfig } from '../hooks/useModulaSettingsEditorConfig';
import { useTakeoverPostMeta } from '../hooks/useTakeoverPostMeta';
import {
	getDisplayBucketsForFields,
	getEnrichedFieldsForGroup,
} from '../data/formSchema';
import { isFieldVisible } from '../logic/fieldVisibility';
import {
	clampProofingSelectionToGallery,
	toProofingSelectionCount,
} from '../logic/proofingSelectionCoupling';
import {
	applyGroupedFieldWrite,
	resetGroupedFieldWrite,
} from '../logic/groupedFieldWrite';
import { getGalleryListUrl } from '../utils/galleryAdminUrls';
import {
	ActionRow,
	Button,
	FieldStack,
	FiltersTokenField,
	IconButton,
	Select,
	StatePill,
	Tabs,
	TextInput,
	Textarea,
} from 'shared-ui';

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
		useTakeoverPostMeta,
		useGallerySettingsFormBundle,
		useGalleryBootstrapQuery,
		getDisplayBucketsForFields,
		getEnrichedFieldsForGroup,
		isFieldVisible,
		clampProofingSelectionToGallery,
		toProofingSelectionCount,
		applyGroupedFieldWrite,
		resetGroupedFieldWrite,
		getGalleryListUrl,
		buildPaginationDynamicCss,
		galleryRootSelector,
		paginationFromGroupedSettings,
		buildPaginationLinkItems,
		resolvePaginationNumber,
		AppearanceToggle,
		GalleryTakeoverTopBar,
		SidebarRailFooter,
		SchemaFieldRow,
		SchemaCompositeRow,
		SchemaCollapsibleFieldGroup,
		TakeoverSettingsAutosave,
		SettingsEditorErrorBoundary,
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
		resolveFilterBarDefaultActiveKey,
		galleryUploadPost,
		parseUploadAttachmentId,
		runFoldersToGalleryPipeline,
		runZipAttachmentPipeline,
		GalleryModal,
		ActionRow,
		Button,
		FieldStack,
		IconButton,
		Select,
		StatePill,
		Tabs,
		TextInput,
		Textarea,
	};
}
