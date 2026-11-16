import {
	TILE_IMAGE_FIT_CONTAIN,
	asGalleryItemList,
	storeIndexToCoreIndex,
} from 'gallery-shared/preview';
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	commitPreviewCatalog,
	stripFocalDataAttributesFromPreviewItem,
} from '../utils/previewItemsCommit';
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
	buildLetterboxPatchFields,
	clearOtherLetterboxFocusSessions,
	mergeLetterboxFieldsIntoCoreItems,
} from '../utils/applyLetterboxFitToGalleryImages';

const CLEARED_FOCUS_FIELDS = {
	focal_x: '',
	focal_y: '',
	focal_crop_x: '',
	focal_crop_y: '',
	focal_crop_w: '',
	focal_crop_h: '',
	tile_image_fit: '',
};

/**
 * The focus fields Apply writes: letterbox alignment, or focal point and crop.
 *
 * @param {{
 *   item: Object,
 *   areaPct: import('react-easy-crop').Area|undefined,
 *   letterboxFit: boolean,
 *   letterboxFocal: { x: number, y: number },
 * }} args
 * @return {{ focal: { x: number, y: number }, fields: Record<string, string|number> }} The focal point and the row fields.
 */
function buildFocusFields({ item, areaPct, letterboxFit, letterboxFocal }) {
	let focal = parseFocalFromItem(item) || { x: 0.5, y: 0.5 };
	if (letterboxFit) {
		focal = letterboxFocal;
	} else if (areaPct) {
		focal = focalFromCroppedArea(areaPct);
	}
	const fields = {
		focal_x: focal.x,
		focal_y: focal.y,
		tile_image_fit: letterboxFit ? TILE_IMAGE_FIT_CONTAIN : '',
		focal_crop_x: '',
		focal_crop_y: '',
		focal_crop_w: '',
		focal_crop_h: '',
	};
	if (letterboxFit) {
		return { focal, fields };
	}
	if (areaPct) {
		fields.focal_crop_x = areaPct.x / 100;
		fields.focal_crop_y = areaPct.y / 100;
		fields.focal_crop_w = areaPct.width / 100;
		fields.focal_crop_h = areaPct.height / 100;
		return { focal, fields };
	}
	return { focal, fields: { ...fields, ...getFocalCrop01FromItem(item) } };
}

/**
 * Apply / reset the image focus from the focus view. Both change the preview
 * store at once and send nothing: the editor save stores them (ADR 0059).
 *
 * @param {{
 *   galleryId: number,
 *   storeIndex: number|null,
 *   item: Object|null,
 *   store: import('redux').Store,
 *   onClose: () => void,
 *   lastAreaRef: import('react').MutableRefObject<import('react-easy-crop').Area|undefined>,
 *   letterboxFit: boolean,
 *   letterboxFocalRef: import('react').MutableRefObject<{ x: number, y: number }|undefined>,
 *   setPersistError: (msg: string) => void,
 * }} args
 * @return {{ applyFocus: (opts?: { applyToAll?: boolean }) => void, clearFocus: () => void }} Focus actions.
 */
export function useFocusPointMutations({
	galleryId,
	storeIndex,
	item,
	store,
	onClose,
	lastAreaRef,
	letterboxFit = false,
	letterboxFocalRef,
	setPersistError,
}) {
	/**
	 * The catalog and the edited row's position in it, or null when the
	 * focus view has no image to edit.
	 */
	const readTarget = useCallback(() => {
		if (storeIndex === null || storeIndex < 0 || !item) {
			return null;
		}
		const itemsLive = store.getState().items.items;
		const coreIndex = storeIndexToCoreIndex(itemsLive, storeIndex);
		const core = asGalleryItemList(itemsLive);
		if (coreIndex < 0 || !core[coreIndex]) {
			return null;
		}
		return { core, coreIndex };
	}, [item, store, storeIndex]);

	const reportMissingImage = useCallback(() => {
		setPersistError(
			__(
				'This image is no longer in the gallery.',
				'modula-best-grid-gallery'
			)
		);
	}, [setPersistError]);

	const applyFocus = useCallback(
		({ applyToAll = false } = {}) => {
			const target = readTarget();
			if (!target) {
				reportMissingImage();
				return;
			}
			setPersistError('');
			const { core, coreIndex } = target;
			const areaPct =
				lastAreaRef.current ??
				focalCropPercentagesFromItem(item) ??
				undefined;
			const { focal, fields } = buildFocusFields({
				item,
				areaPct,
				letterboxFit,
				letterboxFocal: letterboxFocalRef?.current ??
					parseFocalFromItem(item) ?? { x: 0.5, y: 0.5 },
			});
			core[coreIndex] = { ...core[coreIndex], ...fields };
			const applyLetterboxToAll = letterboxFit && applyToAll;
			commitPreviewCatalog(
				store,
				applyLetterboxToAll
					? mergeLetterboxFieldsIntoCoreItems(
							core,
							buildLetterboxPatchFields(focal),
							item.id
						)
					: core
			);
			if (applyLetterboxToAll) {
				clearOtherLetterboxFocusSessions({
					galleryId,
					items: core,
					excludeItemId: item.id,
				});
			}
			const key = getFocusCropStorageKey(galleryId, item);
			if (key && lastAreaRef.current) {
				writeFocusCropAreaToSession(key, lastAreaRef.current);
			}
			onClose();
		},
		[
			galleryId,
			item,
			lastAreaRef,
			letterboxFit,
			letterboxFocalRef,
			onClose,
			readTarget,
			reportMissingImage,
			setPersistError,
			store,
		]
	);

	const clearFocus = useCallback(() => {
		const target = readTarget();
		if (!target) {
			reportMissingImage();
			return;
		}
		setPersistError('');
		const { core, coreIndex } = target;
		core[coreIndex] = stripFocalDataAttributesFromPreviewItem({
			...core[coreIndex],
			...CLEARED_FOCUS_FIELDS,
		});
		commitPreviewCatalog(store, core);
		clearFocusCropAreaFromSession(getFocusCropStorageKey(galleryId, item));
		onClose();
	}, [
		galleryId,
		item,
		onClose,
		readTarget,
		reportMissingImage,
		setPersistError,
		store,
	]);

	return { applyFocus, clearFocus };
}
