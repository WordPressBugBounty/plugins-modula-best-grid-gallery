import {
	TILE_IMAGE_FIT_CONTAIN,
	asGalleryItemList,
	modulaImagesRowIndexForPreviewWrite,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { useMutation } from '@tanstack/react-query';
import { __ } from '@wordpress/i18n';
import { galleryPatchImageByIndex } from '../api/galleryUploadApi';
import {
	commitPreviewCatalog,
	mergeModulaRowIntoPreviewItem,
} from '../utils/previewItemsCommit';
import { patchBootstrapQueryItems } from '../utils/patchBootstrapQueryItems';
import {
	clearFocusCropAreaFromSession,
	focalFromCroppedArea,
	focalCropPercentagesFromItem,
	getFocalCrop01FromItem,
	getFocusCropStorageKey,
	parseFocalFromItem,
	writeFocusCropAreaToSession,
} from '../utils/focusPointCrop';
import {
	applyLetterboxFitToOtherGalleryImages,
	buildLetterboxPatchFields,
	mergeLetterboxFieldsIntoCoreItems,
} from '../utils/applyLetterboxFitToGalleryImages';

/**
 * Save / clear focal point for takeover preview focus modal.
 *
 * @param {{
 *   galleryId: number,
 *   storeIndex: number|null,
 *   item: Object|null,
 *   store: import('redux').Store,
 *   runPersistTask: (fn: () => void | Promise<void>) => Promise<void>,
 *   queryClient: import('@tanstack/react-query').QueryClient,
 *   bootstrapQueryKey: import('@tanstack/react-query').QueryKey,
 *   onClose: () => void,
 *   lastAreaRef: import('react').MutableRefObject<import('react-easy-crop').Area|undefined>,
 *   letterboxFit: boolean,
 *   letterboxFocalRef: import('react').MutableRefObject<{ x: number, y: number }|undefined>,
 *   setPersistError: (msg: string) => void,
 * }} args
 */
export function useFocusPointMutations({
	galleryId,
	storeIndex,
	item,
	store,
	runPersistTask,
	queryClient,
	bootstrapQueryKey,
	onClose,
	lastAreaRef,
	letterboxFit = false,
	letterboxFocalRef,
	setPersistError,
}) {
	const saveMutation = useMutation({
		mutationFn: async ({ applyToAll = false } = {}) => {
			setPersistError('');
			if (!galleryId || storeIndex === null || storeIndex < 0 || !item) {
				throw new Error('missing_context');
			}
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
			const areaPct =
				lastAreaRef.current ??
				focalCropPercentagesFromItem(item) ??
				undefined;
			const letterboxFocal = letterboxFocalRef?.current ??
				parseFocalFromItem(item) ?? { x: 0.5, y: 0.5 };
			const focal = letterboxFit
				? letterboxFocal
				: areaPct
					? focalFromCroppedArea(areaPct)
					: parseFocalFromItem(item) || { x: 0.5, y: 0.5 };
			const fields = {
				focal_x: focal.x,
				focal_y: focal.y,
				tile_image_fit: letterboxFit ? TILE_IMAGE_FIT_CONTAIN : '',
			};
			if (letterboxFit) {
				fields.focal_crop_x = '';
				fields.focal_crop_y = '';
				fields.focal_crop_w = '';
				fields.focal_crop_h = '';
			} else if (areaPct) {
				fields.focal_crop_x = areaPct.x / 100;
				fields.focal_crop_y = areaPct.y / 100;
				fields.focal_crop_w = areaPct.width / 100;
				fields.focal_crop_h = areaPct.height / 100;
			} else {
				const persisted = getFocalCrop01FromItem(item);
				if (persisted) {
					Object.assign(fields, persisted);
				} else {
					fields.focal_crop_x = '';
					fields.focal_crop_y = '';
					fields.focal_crop_w = '';
					fields.focal_crop_h = '';
				}
			}
			const core = asGalleryItemList(itemsLive);
			if (displayCoreIndex >= 0 && core[displayCoreIndex]) {
				core[displayCoreIndex] = {
					...core[displayCoreIndex],
					...fields,
				};
			}
			if (letterboxFit && applyToAll) {
				const letterboxPatch = buildLetterboxPatchFields(focal);
				const merged = mergeLetterboxFieldsIntoCoreItems(
					core,
					letterboxPatch,
					item.id
				);
				commitPreviewCatalog(store, merged);
			} else if (displayCoreIndex >= 0) {
				commitPreviewCatalog(store, core);
			}
			await runPersistTask(async () => {
				const res = await galleryPatchImageByIndex(
					galleryId,
					restRowIndex,
					fields
				);
				const row = res?.image;
				if (!row) {
					throw new Error(
						__(
							'Could not save image focus (empty server response).',
							'modula-best-grid-gallery'
						)
					);
				}
				const coreAfter = asGalleryItemList(
					store.getState().items.items
				);
				coreAfter[displayCoreIndex] = mergeModulaRowIntoPreviewItem(
					coreAfter[displayCoreIndex],
					row
				);
				commitPreviewCatalog(store, coreAfter);
				if (letterboxFit && applyToAll) {
					await applyLetterboxFitToOtherGalleryImages({
						galleryId,
						store,
						fields: buildLetterboxPatchFields(focal),
						excludeItemId: item.id,
					});
				}
			});
		},
		onSuccess: async () => {
			setPersistError('');
			const key = getFocusCropStorageKey(galleryId, item);
			if (key && lastAreaRef.current) {
				writeFocusCropAreaToSession(key, lastAreaRef.current);
			}
			const core = asGalleryItemList(store.getState().items.items);
			patchBootstrapQueryItems(queryClient, galleryId, core);
			onClose();
		},
		onError: (e) => {
			// eslint-disable-next-line no-console
			console.error(e);
			const msg =
				(typeof e?.message === 'string' && e.message) ||
				e?.data?.message ||
				__(
					'Could not save image focus. Please try again.',
					'modula-best-grid-gallery'
				);
			setPersistError(String(msg));
		},
	});

	const clearMutation = useMutation({
		mutationFn: async () => {
			setPersistError('');
			if (!galleryId || storeIndex === null || storeIndex < 0 || !item) {
				throw new Error('missing_context');
			}
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
			const fields = {
				focal_x: '',
				focal_y: '',
				focal_crop_x: '',
				focal_crop_y: '',
				focal_crop_w: '',
				focal_crop_h: '',
				tile_image_fit: '',
			};
			await runPersistTask(async () => {
				const res = await galleryPatchImageByIndex(
					galleryId,
					restRowIndex,
					fields
				);
				const row = res?.image;
				if (!row) {
					throw new Error(
						__(
							'Could not clear image focus (empty server response).',
							'modula-best-grid-gallery'
						)
					);
				}
				const core = asGalleryItemList(
					store.getState().items.items
				);
				core[displayCoreIndex] = mergeModulaRowIntoPreviewItem(
					core[displayCoreIndex],
					row
				);
				commitPreviewCatalog(store, core);
			});
		},
		onSuccess: async () => {
			setPersistError('');
			clearFocusCropAreaFromSession(
				getFocusCropStorageKey(galleryId, item)
			);
			const core = asGalleryItemList(store.getState().items.items);
			patchBootstrapQueryItems(queryClient, galleryId, core);
			onClose();
		},
		onError: (e) => {
			// eslint-disable-next-line no-console
			console.error(e);
			const msg =
				(typeof e?.message === 'string' && e.message) ||
				e?.data?.message ||
				__(
					'Could not clear image focus. Please try again.',
					'modula-best-grid-gallery'
				);
			setPersistError(String(msg));
		},
	});

	return {
		saveMutation,
		clearMutation,
	};
}
