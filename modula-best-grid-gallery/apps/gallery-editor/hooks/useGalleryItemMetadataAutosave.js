/**
 * Debounced autosave for gallery image metadata (sidebar panel).
 * Uses preview Redux store ref — panel mounts outside preview `<Provider>`.
 */
import {
	asGalleryItemList,
	isGalleryPreviewVideoItem,
	modulaImagesRowIndexForPreviewWrite,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { useCallback, useEffect, useRef } from '@wordpress/element';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { galleryPatchImageByIndex } from '../api/galleryUploadApi';
import {
	mergeModulaRowIntoPreviewItem,
	syncPreviewCoreToStoreAndBootstrap,
} from '../utils/previewItemsCommit';
import { applyVideoTemplateDisplayFieldsToPreviewItem } from '../utils/videoTemplateItems';
import { patchBootstrapQueryItems } from '../utils/patchBootstrapQueryItems';
import { getWpMediaAttachmentQueryKey } from '../query/useWpMediaAttachmentQuery';
import { parseFiltersField } from '../components/bulk-edit/bulkEditUtils';
import { mergeTagsIntoGalleryFilterSettings } from '../components/bulk-edit/bulkEditSave';
import { useGallerySettingsFormBundle } from '../form/GallerySettingsFormContext';
import { useTakeoverSaveStatus } from '../context/TakeoverSaveStatusContext';
import { resolveProGateLock } from '../logic/proGateLock';
import { useModulaSettingsEditorConfig } from './useModulaSettingsEditorConfig';
import {
	collectImageMetadataEditValues,
	isImageMetadataEditDirty,
} from '../utils/galleryItemEditDirtyState';
import { getGalleryPreviewReduxStore } from '../utils/previewReduxStoreRef';
import { getGalleryBootstrapQueryKey } from '../query/useGalleryBootstrapQuery';
import {
	IMAGE_METADATA_AUTOSAVE_MS,
	focusedImageMetadataProtectedFieldName,
	mergeImageMetadataSnapshotPreservingLocalProtected,
	shouldApplyImageMetadataExternalReset,
} from '../utils/imageMetadataAutosavePolicy';

/**
 * @param {{
 *   galleryId: number,
 *   storeIndex: number,
 *   attachmentId: number,
 *   item: Object|null,
 *   form: import('@tanstack/react-form').ReactFormExtendedApi<any>,
 *   enabled?: boolean,
 * }} args
 */
export function useGalleryItemMetadataAutosave({
	galleryId,
	storeIndex,
	attachmentId,
	item,
	form,
	enabled = true,
}) {
	const queryClient = useQueryClient();
	const { form: gallerySettingsForm } = useGallerySettingsFormBundle();
	const { runPersistTask } = useTakeoverSaveStatus();
	const editor = useModulaSettingsEditorConfig();
	const timerRef = useRef(
		/** @type {ReturnType<typeof setTimeout>|null} */ (null)
	);
	const savingRef = useRef(false);
	const pendingResaveRef = useRef(false);

	const videoGate = resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: 'modula-video' },
		editor
	);
	const exifGate = resolveProGateLock(
		{ kind: 'requiresExtension', extensionSlug: 'modula-exif' },
		editor
	);
	const filtersGate = resolveProGateLock({ kind: 'requiresPro' }, editor);

	const buildImagePatchFields = useCallback(() => {
		const local = collectImageMetadataEditValues(
			form,
			storeIndex,
			attachmentId
		);
		const fields = {
			title: local.title,
			alt: local.alt,
			description: local.description,
			link: local.link,
			target: Number(local.target) || 0,
			halign: local.halign,
			valign: local.valign,
			togglelightbox: Number(local.togglelightbox) || 0,
			hide_title: Number(local.hide_title) || 0,
		};
		if (filtersGate.allowed) {
			fields.filters = local.filters;
			mergeTagsIntoGalleryFilterSettings(
				gallerySettingsForm,
				parseFiltersField(local.filters)
			);
		}
		if (videoGate.allowed) {
			fields.video_url = local.video_url;
			fields.video_thumbnail = local.video_thumbnail;
			fields.autoplay_thumbnail = local.autoplay_thumbnail;
			fields.autoplay_lightbox = local.autoplay_lightbox;
			fields.loop_video = local.loop_video;
		}
		const enableExif = Boolean(
			gallerySettingsForm.state.values?.exif?.enableExif
		);
		if (exifGate.allowed && enableExif) {
			fields.exif_camera = local.exif_camera;
			fields.exif_lens = local.exif_lens;
			fields.exif_focal_length = local.exif_focal_length;
			fields.exif_shutter_speed = local.exif_shutter_speed;
			fields.exif_aperture = local.exif_aperture;
			fields.exif_iso = local.exif_iso;
			fields.exif_date = local.exif_date;
		}
		return fields;
	}, [
		attachmentId,
		exifGate.allowed,
		filtersGate.allowed,
		form,
		gallerySettingsForm,
		storeIndex,
		videoGate.allowed,
	]);

	const saveMutation = useMutation({
		mutationFn: async () => {
			const store = getGalleryPreviewReduxStore();
			if (
				!enabled ||
				!galleryId ||
				!store ||
				storeIndex === null ||
				storeIndex < 0 ||
				!item
			) {
				return null;
			}
			if (
				!isImageMetadataEditDirty(item, form, storeIndex, attachmentId)
			) {
				return null;
			}
			const fields = buildImagePatchFields();
			const itemsLive = store.getState().items.items;
			const displayCoreIndex = storeIndexToCoreIndex(
				itemsLive,
				storeIndex
			);
			const restRowIndex = modulaImagesRowIndexForPreviewWrite(
				itemsLive,
				storeIndex
			);
			if (displayCoreIndex < 0 || restRowIndex < 0) {
				throw new Error('invalid_indices');
			}
			await runPersistTask(async () => {
				const res = await galleryPatchImageByIndex(
					galleryId,
					restRowIndex,
					fields
				);
				const core = asGalleryItemList(store.getState().items.items);
				const prevItem = core[displayCoreIndex];
				if (!prevItem) {
					return;
				}
				const row = res?.image ?? {};
				const live = collectImageMetadataEditValues(
					form,
					storeIndex,
					attachmentId
				);
				const mergedRow = mergeModulaRowIntoPreviewItem(prevItem, {
					...row,
					title: live.title,
					description: live.description,
					video_url: row.video_url ?? fields.video_url,
					video_thumbnail:
						row.video_thumbnail ?? fields.video_thumbnail,
				});
				core[displayCoreIndex] =
					applyVideoTemplateDisplayFieldsToPreviewItem(mergedRow, {
						video_url: mergedRow.video_url ?? fields.video_url,
						video_thumbnail:
							mergedRow.video_thumbnail ?? fields.video_thumbnail,
					});
				syncPreviewCoreToStoreAndBootstrap(
					store,
					queryClient,
					galleryId,
					core
				);
			});
			return {
				savedImageValues: collectImageMetadataEditValues(
					form,
					storeIndex,
					attachmentId
				),
			};
		},
		onSuccess: async (result) => {
			const store = getGalleryPreviewReduxStore();
			if (!result || !store) {
				return;
			}
			const focused = focusedImageMetadataProtectedFieldName(
				typeof document !== 'undefined' ? document.activeElement : null
			);
			if (attachmentId > 0 && !focused) {
				await queryClient.invalidateQueries({
					queryKey: getWpMediaAttachmentQueryKey(attachmentId),
				});
			}
			const core = asGalleryItemList(store.getState().items.items);
			patchBootstrapQueryItems(queryClient, galleryId, core);
			const galleryType = store.getState().gallery?.config?.type;
			if (!focused && isGalleryPreviewVideoItem(item, galleryType)) {
				await queryClient.refetchQueries({
					queryKey: getGalleryBootstrapQueryKey(galleryId),
				});
			}
			if (focused) {
				return;
			}
			if (result?.savedImageValues) {
				const current = collectImageMetadataEditValues(
					form,
					storeIndex,
					attachmentId
				);
				if (
					shouldApplyImageMetadataExternalReset({
						focusedProtectedKey: focused,
						currentValues: current,
						incomingValues: result.savedImageValues,
					})
				) {
					form.reset(result.savedImageValues);
				} else {
					form.reset(
						mergeImageMetadataSnapshotPreservingLocalProtected({
							currentValues: current,
							incomingValues: result.savedImageValues,
						})
					);
				}
			}
		},
		onError: (e) => {
			// eslint-disable-next-line no-console
			console.error(e);
		},
	});

	const { mutate, mutateAsync, isPending } = saveMutation;
	const isPendingRef = useRef(isPending);
	isPendingRef.current = isPending;

	const scheduleSave = useCallback(() => {
		if (!enabled) {
			return;
		}
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			timerRef.current = null;
			if (savingRef.current || isPendingRef.current) {
				pendingResaveRef.current = true;
				return;
			}
			savingRef.current = true;
			mutate(undefined, {
				onSettled: () => {
					savingRef.current = false;
					const needsResave = pendingResaveRef.current;
					pendingResaveRef.current = false;
					if (needsResave) {
						scheduleSave();
					}
				},
			});
		}, IMAGE_METADATA_AUTOSAVE_MS);
	}, [enabled, mutate]);

	useEffect(() => {
		if (!enabled) {
			return undefined;
		}
		return form.store.subscribe(() => {
			scheduleSave();
		});
	}, [enabled, form.store, scheduleSave]);

	useEffect(() => {
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	const flush = useCallback(async () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		pendingResaveRef.current = false;
		if (
			!enabled ||
			!item ||
			!isImageMetadataEditDirty(item, form, storeIndex, attachmentId)
		) {
			return;
		}
		await mutateAsync();
	}, [attachmentId, enabled, form, item, mutateAsync, storeIndex]);

	return {
		scheduleSave,
		flush,
		isSaving: saveMutation.isPending,
		filtersGate,
		videoGate,
		exifGate,
	};
}
