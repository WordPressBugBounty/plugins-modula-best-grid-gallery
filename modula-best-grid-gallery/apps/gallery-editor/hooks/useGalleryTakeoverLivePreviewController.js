/**
 * State, effects, and admin callbacks for the takeover live preview mounted body.
 */
import { useCallback, useRef } from '@wordpress/element';
import { useInvalidateGalleryBootstrap } from './useInvalidateGalleryBootstrap';
import { useTakeoverPreviewStore } from './takeover-live-preview/useTakeoverPreviewStore';
import { usePreviewPersistCoordinator } from './takeover-live-preview/usePreviewPersistCoordinator';
import { usePreviewUploadDropZones } from './takeover-live-preview/usePreviewUploadDropZones';
import { usePreviewItemModals } from './takeover-live-preview/usePreviewItemModals';
import { usePreviewItemAdminActions } from './takeover-live-preview/usePreviewItemAdminActions';
import { useCustomGridPaginationLayoutEffect } from './takeover-live-preview/useCustomGridPaginationLayoutEffect';
import { useFitGridClearImageFocus } from './useFitGridClearImageFocus';
import { useTemplateLayoutSideEffects } from './useTemplateLayoutSideEffects';
import { runCustomGridPreviewItemMutation } from '../utils/customGridPreviewItemMutation';

/**
 * @param {{
 *   galleryId: number,
 *   bootstrap: object,
 *   groupedSettings: object,
 *   previewViewport: 'desktop'|'tablet'|'mobile',
 *   galleryTitle?: string,
 *   artboardInnerWidth?: number,
 * }} args
 */
export function useGalleryTakeoverLivePreviewController({
	galleryId,
	bootstrap,
	groupedSettings,
	previewViewport,
	galleryTitle,
	artboardInnerWidth = 0,
}) {
	const galleryType =
		groupedSettings?.general?.type &&
		typeof groupedSettings.general.type === 'string'
			? groupedSettings.general.type
			: '';
	const preservePreviewItemsRef = useRef(() => false);

	const { store, storeRef } = useTakeoverPreviewStore({
		galleryId,
		bootstrap,
		groupedSettings,
		previewViewport,
		galleryTitle,
		shouldPreservePreviewItemsRef: preservePreviewItemsRef,
	});

	const {
		queryClient,
		bootstrapQueryKey,
		runPersistTaskWithDeferredRefresh,
		schedulePersistPreviewItems,
		flushPreviewItemsPersistNow,
		resetPreviewPersistDirty,
		isPreviewItemsPersistPending,
	} = usePreviewPersistCoordinator({
		galleryId,
		storeRef,
		preservePreviewItemsRef,
	});

	useCustomGridPaginationLayoutEffect({
		store,
		galleryType,
		enablePagination: groupedSettings?.pagination?.enablePagination,
		schedulePersistPreviewItems,
	});

	const runPreviewItemMutation = useCallback(
		(task) =>
			runCustomGridPreviewItemMutation({
				isPersistPending: isPreviewItemsPersistPending,
				flushPersist: flushPreviewItemsPersistNow,
				runMutation: runPersistTaskWithDeferredRefresh,
				task,
			}),
		[
			isPreviewItemsPersistPending,
			flushPreviewItemsPersistNow,
			runPersistTaskWithDeferredRefresh,
		]
	);

	const {
		metaModalStoreIndex,
		setMetaModalStoreIndex,
		saveMetaModalReturnFocus,
		closeMetaModal,
		contentBlockEdit,
		setContentBlockEdit,
		previewGalleryShellStyle,
		galleryWidthOverflow,
	} = usePreviewItemModals({
		galleryType,
		groupedSettings,
		artboardInnerWidth,
	});

	useFitGridClearImageFocus({
		galleryId,
		galleryType,
		storeRef,
		runPersistTask: runPersistTaskWithDeferredRefresh,
	});

	const templateLayout =
		groupedSettings?.template?.templateLayout &&
		typeof groupedSettings.template.templateLayout === 'string'
			? groupedSettings.template.templateLayout
			: 'split-stack';

	useTemplateLayoutSideEffects({
		galleryId,
		store,
		galleryType,
		templateLayout,
		runPersistTask: runPersistTaskWithDeferredRefresh,
	});

	const { handleSaveContentBlock, previewAdminValue } =
		usePreviewItemAdminActions({
			galleryId,
			galleryType,
			queryClient,
			storeRef,
			runPreviewItemMutation,
			contentBlockEdit,
			setContentBlockEdit,
			saveMetaModalReturnFocus,
			setMetaModalStoreIndex,
			schedulePersistPreviewItems,
		});

	const invalidateBootstrap = useInvalidateGalleryBootstrap(galleryId);

	const {
		dropZoneError,
		dismissDropZoneError,
		startZoneDisplay,
		endZoneDisplay,
		dropZoneInteractive,
		handleDropZoneFiles,
	} = usePreviewUploadDropZones({
		galleryId,
		runPreviewItemMutation,
		invalidateBootstrap,
	});

	const previewItemPersistApi = {
		runPersistTaskWithDeferredRefresh,
		flushPreviewItemsPersistNow,
		resetPreviewPersistDirty,
	};

	return {
		store,
		galleryType,
		previewGalleryShellStyle,
		galleryWidthOverflow,
		queryClient,
		bootstrapQueryKey,
		previewItemPersistApi,
		metaModalStoreIndex,
		setMetaModalStoreIndex,
		closeMetaModal,
		contentBlockEdit,
		setContentBlockEdit,
		handleSaveContentBlock,
		previewAdminValue,
		runPreviewItemMutation,
		dropZoneError,
		dismissDropZoneError,
		startZoneDisplay,
		endZoneDisplay,
		dropZoneInteractive,
		handleDropZoneFiles,
	};
}
