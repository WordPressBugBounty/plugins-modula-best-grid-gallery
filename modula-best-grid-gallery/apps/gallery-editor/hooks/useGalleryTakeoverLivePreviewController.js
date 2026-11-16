/**
 * State, effects, and admin callbacks for the takeover live preview mounted body.
 */
import { useMemo, useRef } from '@wordpress/element';
import { useTakeoverPreviewStore } from './takeover-live-preview/useTakeoverPreviewStore';
import { useGalleryItemsSavePart } from './takeover-live-preview/useGalleryItemsSavePart';
import { usePreviewItemModals } from './takeover-live-preview/usePreviewItemModals';
import { usePreviewItemAdminActions } from './takeover-live-preview/usePreviewItemAdminActions';
import { useCustomGridPaginationLayoutEffect } from './takeover-live-preview/useCustomGridPaginationLayoutEffect';
import { useFitGridClearImageFocus } from './useFitGridClearImageFocus';
import { useTemplateLayoutSideEffects } from './useTemplateLayoutSideEffects';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';

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
	const { undoRedo } = useGallerySettingsFormBundle();
	// Filled by the items part below, read by hydration after render.
	const itemsBaselineRef = useRef({
		hasUnsavedChanges: () => false,
		adoptStoredItems: () => {},
	});

	const { store, storeRef } = useTakeoverPreviewStore({
		galleryId,
		bootstrap,
		groupedSettings,
		previewViewport,
		galleryTitle,
		itemsBaselineRef,
	});

	const { hasUnsavedChanges, adoptStoredItems, commitDerivedItems } =
		useGalleryItemsSavePart({
			galleryId,
			store,
			commitItemsStep: undoRedo.commitItemsStep,
		});
	itemsBaselineRef.current = { hasUnsavedChanges, adoptStoredItems };

	useCustomGridPaginationLayoutEffect({
		store,
		galleryType,
		enablePagination: groupedSettings?.pagination?.enablePagination,
		dropLayoutSteps: undoRedo.dropLayoutSteps,
	});

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
		commitDerivedItems,
	});

	const templateLayout =
		groupedSettings?.template?.templateLayout &&
		typeof groupedSettings.template.templateLayout === 'string'
			? groupedSettings.template.templateLayout
			: 'split-stack';

	useTemplateLayoutSideEffects({
		store,
		galleryType,
		templateLayout,
	});

	const { handleSaveContentBlock, previewAdminValue } =
		usePreviewItemAdminActions({
			galleryId,
			galleryType,
			storeRef,
			contentBlockEdit,
			setContentBlockEdit,
			saveMetaModalReturnFocus,
			setMetaModalStoreIndex,
		});

	const previewItemsPart = useMemo(
		() => ({ commitDerivedItems }),
		[commitDerivedItems]
	);

	return {
		store,
		galleryType,
		previewGalleryShellStyle,
		galleryWidthOverflow,
		previewItemsPart,
		metaModalStoreIndex,
		setMetaModalStoreIndex,
		closeMetaModal,
		contentBlockEdit,
		setContentBlockEdit,
		handleSaveContentBlock,
		previewAdminValue,
	};
}
